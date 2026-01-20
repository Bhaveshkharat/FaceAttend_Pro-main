import os
import io
import cv2
import numpy as np
import base64
from fastapi import FastAPI, File, UploadFile, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
import insightface
from insightface.app import FaceAnalysis
from pymongo import MongoClient
import uvicorn
from dotenv import load_dotenv
from PIL import Image

# Load environment variables
load_dotenv()  # Load from current directory (.env)

app = FastAPI()

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# MongoDB Connection
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/face_attendance")
client = MongoClient(MONGO_URI)
db = client.get_database() # Uses database from connection string
face_collection = db.face_profiles

# Initialize InsightFace
# buffalo_l is accurate but heavy. buffalo_sc is much lighter for limited RAM (Railway)
MODEL_NAME = os.getenv("FACE_MODEL", "buffalo_sc")
print(f"Initializing InsightFace model: {MODEL_NAME}...")
face_app = FaceAnalysis(name=MODEL_NAME)
face_app.prepare(ctx_id=-1, det_size=(320, 320))
print(f"Model {MODEL_NAME} loaded successfully")

def process_image(file_bytes):
    """Convert bytes to opencv format"""
    image = Image.open(io.BytesIO(file_bytes)).convert("RGB")
    img_np = np.array(image)
    # Convert RGB to BGR for OpenCV/InsightFace
    img_bgr = cv2.cvtColor(img_np, cv2.COLOR_RGB2BGR)
    return img_bgr

def calculate_similarity(feat1, feat2):
    """Compute Cosine Similarity between two embeddings"""
    # vectors are typically normalized, but let's be safe
    return np.dot(feat1, feat2) / (np.linalg.norm(feat1) * np.linalg.norm(feat2))

@app.get("/")
def health_check():
    return {"status": "ok", "service": "InsightFace Microservice"}

@app.post("/register")
async def register_face(
    image: UploadFile = File(...),
    userId: str = Form(...),
    managerId: str = Form(None)
):
    try:
        contents = await image.read()
        print(f"Received registration request for userId: {userId}, managerId: {managerId}, image size: {len(contents)} bytes")
        
        img_bgr = process_image(contents)
        print("Image processed successfully")

        faces = face_app.get(img_bgr)
        print(f"Detected {len(faces)} faces")

        if len(faces) == 0:
            raise HTTPException(status_code=400, detail="No face detected")
        
        if len(faces) > 1:
            raise HTTPException(status_code=400, detail="Multiple faces detected. Please ensure only one person is in frame.")

        # Get the largest face
        face = sorted(faces, key=lambda x: (x.bbox[2]-x.bbox[0]) * (x.bbox[3]-x.bbox[1]))[-1]
        
        embedding = face.embedding.tolist()  # Convert to standard list for Storage
        target_embedding = np.array(face.embedding, dtype=np.float32)

        # 🔍 DUPLICATE DETECTION: Check if this face already belongs to someone else UNDER THE SAME MANAGER
        # Lowering to 0.50 to be more aggressive in catching duplicates
        DUPLICATE_THRESHOLD = 0.50
        
        # Build filter: same manager, different userId
        query = {"userId": {"$ne": userId}, "embedding": {"$exists": True}}
        if managerId:
            query["managerId"] = managerId
            
        profiles = list(face_collection.find(query))
        
        best_dup_score = -1.0
        best_dup_id = None

        for profile in profiles:
            stored_emb = np.array(profile['embedding'], dtype=np.float32)
            sim = calculate_similarity(target_embedding, stored_emb)
            
            if sim > best_dup_score:
                best_dup_score = sim
                best_dup_id = profile['userId']

            if sim > DUPLICATE_THRESHOLD:
                print(f"DUPLICATE REJECTED (Manager {managerId}): matches {profile['userId']} with score {sim}")
                raise HTTPException(
                    status_code=400, 
                    detail=f"Face already registered for this manager under ID: {profile['userId']}"
                )

        print(f"Registration Check: Best internal match for {userId} was {best_dup_id} with score {best_dup_score}")
        print(f"Saving embedding to MongoDB for userId: {userId}")
        
        # Save to MongoDB
        update_data = {
            "userId": userId,
            "embedding": embedding,
            "updatedAt": os.getenv("CURRENT_DATE", "NOW") 
        }
        if managerId:
            update_data["managerId"] = managerId

        res = face_collection.update_one(
            {"userId": userId},
            {"$set": update_data},
            upsert=True
        )
        print(f"MongoDB update result: {res.modified_count} modified, {res.upserted_id} upserted")

        return {"success": True, "message": "Face registered successfully"}

    except HTTPException as he:
        raise he
    except Exception as e:
        print(f"Registration Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/verify")
async def verify_face(
    image: UploadFile = File(...),
    managerId: str = Form(None)
):
    try:
        contents = await image.read()
        print(f"Received verification request (Manager: {managerId}), image size: {len(contents)} bytes")
            
        img_bgr = process_image(contents)

        faces = face_app.get(img_bgr)

        if len(faces) == 0:
            raise HTTPException(status_code=400, detail="No face detected")

        # Get largest face
        target_face = sorted(faces, key=lambda x: (x.bbox[2]-x.bbox[0]) * (x.bbox[3]-x.bbox[1]))[-1]
        target_embedding = np.array(target_face.embedding, dtype=np.float32)

        # Retrieve all embeddings from DB FOR THIS MANAGER ONLY
        query = {"embedding": {"$exists": True}}
        if managerId:
            query["managerId"] = managerId
            
        profiles = list(face_collection.find(query))

        best_score = -1.0
        best_match = None

        for profile in profiles:
            stored_embedding = np.array(profile['embedding'], dtype=np.float32)
            sim = calculate_similarity(target_embedding, stored_embedding)
            
            if sim > best_score:
                best_score = sim
                best_match = profile

        # Thresholds: 0.40 is good for buffalo_sc/buffalo_l.
        VERIFY_THRESHOLD = 0.40 

        if best_match and best_score >= VERIFY_THRESHOLD:
            print(f"VERIFIED (Manager {managerId}): {best_match['userId']} with score {best_score}")
            return {
                "success": True,
                "verified": True,
                "userId": best_match['userId'],
                "score": float(best_score)
            }
        
        print(f"NOT RECOGNIZED: Best score in manager context was {best_score}")
        return {
            "success": True,
            "verified": False,
            "message": "Face not recognized in this manager's database",
            "score": float(best_score)
        }

    except HTTPException as he:
        raise he
    except Exception as e:
        print(f"Verification Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)

