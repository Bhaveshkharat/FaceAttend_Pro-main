# Download MediaPipe Files for Chrome Extension

Chrome extensions (Manifest V3) don't allow loading external scripts from CDNs. We need to download MediaPipe libraries locally.

## Steps:

1. **Create a `mediapipe` folder** inside `ChromeExtension/` folder (if it doesn't exist)

2. **Download these 4 files** and save them in `ChromeExtension/mediapipe/`:

   - `camera_utils.js` from: https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js
   - `control_utils.js` from: https://cdn.jsdelivr.net/npm/@mediapipe/control_utils/control_utils.js
   - `drawing_utils.js` from: https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js
   - `face_mesh.js` from: https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/face_mesh.js

3. **Quick way to download:**
   - Open each URL in your browser
   - Right-click → "Save As" → Save to `ChromeExtension/mediapipe/` folder
   - Or use a download manager/browser extension

4. **After downloading**, you'll need to rebuild the web app with code changes that use local paths instead of CDN.

## Alternative: Use a different approach

If downloading manually is too complex, we can modify the code to use a different face detection method that doesn't require external CDN scripts.
