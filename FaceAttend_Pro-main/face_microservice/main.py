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
# Using buffalo_l model (good balance of speed/acc)
print("Initializing InsightFace model...")
face_app = FaceAnalysis(name='buffalo_l')
face_app.prepare(ctx_id=-1, det_size=(640, 640))
print("Model loaded successfully")

def process_image(file_bytes):
    """Convert bytes to opencv format"""
    image = Image.open(io.BytesIO(file_bytes)).convert("RGB")
    img_np = np.array(image)
    # Convert RGB to BGR for OpenCV/InsightFace
    img_bgr = cv2.cvtColor(img_np, cv2.COLOR_RGB2BGR)
    return img_bgr

@app.get("/")
def health_check():
    return {"status": "ok", "service": "InsightFace Microservice"}

@app.post("/register")
async def register_face(
    image: UploadFile = File(...),
    userId: str = Form(...)
):
    try:
        contents = await image.read()
        print(f"Received registration request for userId: {userId}, image size: {len(contents)} bytes")
        
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

        print(f"Saving embedding to MongoDB for userId: {userId}")
        # Save to MongoDB
        # Using update_one with upsert to replace existing if any
        res = face_collection.update_one(
            {"userId": userId},
            {
                "$set": {
                    "userId": userId,
                    "embedding": embedding,
                    "updatedAt": os.getenv("CURRENT_DATE", "NOW") 
                }
            },
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
async def verify_face(image: UploadFile = File(...)):
    try:
        contents = await image.read()
        print(f"Received verification request, image size: {len(contents)} bytes")
            
        img_bgr = process_image(contents)

        faces = face_app.get(img_bgr)

        if len(faces) == 0:
            raise HTTPException(status_code=400, detail="No face detected")

        # Get largest face
        target_face = sorted(faces, key=lambda x: (x.bbox[2]-x.bbox[0]) * (x.bbox[3]-x.bbox[1]))[-1]
        target_embedding = np.array(target_face.embedding, dtype=np.float32)

        # Retrieve all embeddings from DB
        # TODO: Optimize by using vector database or indexing if scaling up
        # For small employees list (<1000), iterating is fine (~10-20ms)
        profiles = list(face_collection.find({"embedding": {"$exists": True}}))

        best_score = -1.0
        best_match = None

        for profile in profiles:
            stored_embedding = np.array(profile['embedding'], dtype=np.float32)
            
            # Compute Cosine Similarity
            # inner product of normalized vectors
            sim = np.dot(target_embedding, stored_embedding) / (np.linalg.norm(target_embedding) * np.linalg.norm(stored_embedding))
            
            if sim > best_score:
                best_score = sim
                best_match = profile

        # Thresholds for ArcFace typically around 0.25 - 0.4 depending on strictness
        # 0.4 is usually a very safe match.
        SIMILARITY_THRESHOLD = 0.4 

        if best_match and best_score >= SIMILARITY_THRESHOLD:
            return {
                "success": True,
                "verified": True,
                "userId": best_match['userId'],
                "score": float(best_score)
            }
        
        return {
            "success": True,
            "verified": False,
            "message": "Face not recognized",
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

