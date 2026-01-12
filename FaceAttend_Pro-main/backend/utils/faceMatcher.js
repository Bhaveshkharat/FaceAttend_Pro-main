const faceapi = require("@vladmandic/face-api");

const FACE_MATCH_THRESHOLD = 0.45;

function getBestMatch(scanDescriptor, users) {
  let bestMatch = null;
  let minDistance = 1;

  for (const user of users) {
    const distance = faceapi.euclideanDistance(
      scanDescriptor,
      user.faceDescriptor
    );

    if (distance < minDistance) {
      minDistance = distance;
      bestMatch = user;
    }
  }

  return minDistance < FACE_MATCH_THRESHOLD ? bestMatch : null;
}

module.exports = { getBestMatch };
