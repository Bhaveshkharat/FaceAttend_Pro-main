const faceapi = require("face-api.js");
const tf = require("@tensorflow/tfjs");
const canvas = require("canvas");
const path = require("path");

const FaceProfile = require("../models/FaceProfile");

const { Canvas, Image, ImageData } = canvas;
faceapi.env.monkeyPatch({ Canvas, Image, ImageData });

const MODEL_PATH = path.join(__dirname, "..", "face_models");

let modelsLoaded = false;
const FACE_MATCH_THRESHOLD = 0.45;

/* =========================
   🔄 LOAD FACE-API MODELS
========================= */
async function loadModels() {
  if (modelsLoaded) return;

  await faceapi.nets.ssdMobilenetv1.loadFromDisk(MODEL_PATH);
  await faceapi.nets.faceLandmark68Net.loadFromDisk(MODEL_PATH);
  await faceapi.nets.faceRecognitionNet.loadFromDisk(MODEL_PATH);

  modelsLoaded = true;
  console.log("✅ Face-API models loaded (Node / CPU)");
}

/**
 * ⚡ PRELOAD & WARM UP
 * Calls models and runs a dummy detect to warm up TensorFlow
 */
async function preloadModels() {
  try {
    console.log("⏳ Preloading face models...");
    await loadModels();

    // Warm up: Run a dummy detection on a small blank canvas
    const dummyCanvas = canvas.createCanvas(1, 1);
    await faceapi.detectSingleFace(dummyCanvas).withFaceLandmarks().withFaceDescriptor();

    console.log("⚡ Face recognition engine warmed up and ready!");
  } catch (err) {
    console.error("❌ Preload Error:", err);
  }
}

/* =========================
   🧠 EXTRACT FACE DESCRIPTOR
========================= */
async function getFaceDescriptor(imagePath) {
  await loadModels();

  const img = await canvas.loadImage(imagePath);

  console.time(`Descriptor Extraction: ${path.basename(imagePath)}`);
  const detection = await faceapi
    .detectSingleFace(img)
    .withFaceLandmarks()
    .withFaceDescriptor();
  console.timeEnd(`Descriptor Extraction: ${path.basename(imagePath)}`);

  if (!detection) return null;

  return Array.from(detection.descriptor);
}

/* =========================
   🔐 FACE REGISTRATION
   (Used during onboarding)
========================= */
async function registerFace(imagePath, { userId, name }) {
  const descriptor = await getFaceDescriptor(imagePath);

  if (!descriptor) {
    return {
      success: false,
      message: "No face detected"
    };
  }

  await FaceProfile.findOneAndUpdate(
    { userId },
    {
      userId,
      name,
      descriptor
    },
    { upsert: true, new: true }
  );

  return {
    success: true,
    message: "Face registered successfully"
  };
}

/* =========================
   🔍 MATCH FACE (CORE LOGIC)
   Used by attendance scan
========================= */
async function matchFace(scanDescriptor, profiles) {
  let bestMatch = null;
  let minDistance = 1;

  for (const profile of profiles) {
    const distance = faceapi.euclideanDistance(
      scanDescriptor,
      profile.descriptor
    );

    if (distance < minDistance) {
      minDistance = distance;
      bestMatch = profile;
    }
  }

  if (!bestMatch || minDistance > FACE_MATCH_THRESHOLD) {
    return null;
  }

  return {
    userId: bestMatch.userId,
    name: bestMatch.name,
    confidence: Number((1 - minDistance).toFixed(2))
  };
}

/* =========================
   🏢 KIOSK MODE RECOGNITION
   (Attendance scan API)
========================= */
async function recognizeFaceForAttendance(imagePath) {
  const descriptor = await getFaceDescriptor(imagePath);
  console.log("🖼 Image path:", imagePath);
  if (!descriptor) {
    return {
      matched: false,
      message: "No face detected"
    };
  }

  const profiles = await FaceProfile.find();
  console.log("👥 Face profiles count:", profiles.length);
  console.time("Face Match Distance Loop");
  const match = await matchFace(descriptor, profiles);
  console.timeEnd("Face Match Distance Loop");
  console.log("🎯 Match result:", match);
  if (!match) {
    return {
      matched: false,
      message: "Face not recognized"
    };
  }

  return {
    matched: true,
    userId: match.userId,
    name: match.name,
    confidence: match.confidence
  };
}

module.exports = {
  registerFace,
  recognizeFaceForAttendance,
  getFaceDescriptor,
  matchFace,
  preloadModels
};






// const faceapi = require("face-api.js");
// const tf = require("@tensorflow/tfjs");
// const canvas = require("canvas");
// const path = require("path");

// const FaceProfile = require("../models/FaceProfile");

// const { Canvas, Image, ImageData } = canvas;
// faceapi.env.monkeyPatch({ Canvas, Image, ImageData });

// const MODEL_PATH = path.join(__dirname, "..", "face_models");

// let loaded = false;

// async function loadModels() {
//   if (loaded) return;

//   await faceapi.nets.ssdMobilenetv1.loadFromDisk(MODEL_PATH);
//   await faceapi.nets.faceLandmark68Net.loadFromDisk(MODEL_PATH);
//   await faceapi.nets.faceRecognitionNet.loadFromDisk(MODEL_PATH);

//   loaded = true;
//   console.log("✅ Face-API models loaded (CPU)");
// }


// async function getDescriptor(imagePath) {
//   const img = await canvas.loadImage(imagePath);

//   const detection = await faceapi
//     .detectSingleFace(img)
//     .withFaceLandmarks()
//     .withFaceDescriptor();

//   if (!detection) return null;
//   return Array.from(detection.descriptor);
// }

// /**
//  * 🔐 FACE REGISTRATION
//  * - DOES NOT create User
//  * - ONLY stores face data
//  */
// async function registerFace(imagePath, { userId, name }) {
//   await loadModels();

//   const descriptor = await getDescriptor(imagePath);
//   if (!descriptor) {
//     return {
//       success: false,
//       message: "No face detected"
//     };
//   }

//   await FaceProfile.findOneAndUpdate(
//     { userId },
//     {
//       userId,
//       name,
//       descriptor
//     },
//     { upsert: true, new: true }
//   );

//   return {
//     success: true,
//     message: "Face registered successfully"
//   };
// }

// /**
//  * 🔍 FACE RECOGNITION
//  */
// async function recognizeFace(imagePath) {
//   await loadModels();

//   const descriptor = await getDescriptor(imagePath);
//   if (!descriptor) {
//     return {
//       success: true,
//       matched: false,
//       message: "No face detected"
//     };
//   }

//   const profiles = await FaceProfile.find();

//   let bestMatch = null;
//   let minDistance = 0.65;

//   profiles.forEach(profile => {
//     const dist = faceapi.euclideanDistance(
//       descriptor,
//       profile.descriptor
//     );

//     if (dist < minDistance) {
//       minDistance = dist;
//       bestMatch = profile;
//     }
//   });

//   if (!bestMatch) {
//     return {
//       success: true,
//       matched: false
//     };
//   }

//   return {
//     success: true,
//     matched: true,
//     userId: bestMatch.userId,
//     name: bestMatch.name,
//     confidence: Number((1 - minDistance).toFixed(2))
//   };
// }

// module.exports = {
//   registerFace,
//   recognizeFace
// };
