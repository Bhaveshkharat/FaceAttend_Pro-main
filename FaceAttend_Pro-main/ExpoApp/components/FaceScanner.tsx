import React, { useRef, useState, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator, Text, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import { Camera } from 'expo-camera';

interface Props {
    onCapture: (base64Image: string) => void;
    onCancel?: () => void;
}

export default function FaceScanner({ onCapture, onCancel }: Props) {
    const webviewRef = useRef<WebView>(null);
    const [loading, setLoading] = useState(true);
    const [hasPermission, setHasPermission] = useState<boolean | null>(null);

    useEffect(() => {
        (async () => {
            const { status } = await Camera.requestCameraPermissionsAsync();
            setHasPermission(status === 'granted');
        })();
    }, []);

    if (hasPermission === null) {
        return <View style={styles.loading}><ActivityIndicator /></View>;
    }
    if (hasPermission === false) {
        return <View style={styles.loading}><Text style={{ color: 'white' }}>No Camera Permission</Text></View>;
    }

    // HTML Content with MediaPipe Face Mesh
    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
      <script src="https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js" crossorigin="anonymous"></script>
      <script src="https://cdn.jsdelivr.net/npm/@mediapipe/control_utils/control_utils.js" crossorigin="anonymous"></script>
      <script src="https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js" crossorigin="anonymous"></script>
      <script src="https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/face_mesh.js" crossorigin="anonymous"></script>
      <style>
        body { margin: 0; padding: 0; overflow: hidden; background: black; display: flex; justify-content: center; align-items: center; height: 100vh; }
        video { position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; transform: scaleX(-1); }
        canvas { position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; transform: scaleX(-1); }
        #status {
            position: absolute;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0,0,0,0.6);
            color: white;
            padding: 8px 16px;
            border-radius: 20px;
            font-family: sans-serif;
            font-size: 16px;
            z-index: 10;
            text-align: center;
        }
        .guide-box {
            position: absolute;
            width: 280px;
            height: 350px;
            border: 2px solid rgba(255, 255, 255, 0.5);
            border-radius: 150px;
            z-index: 5;
            box-shadow: 0 0 0 1000px rgba(0,0,0,0.5);
        }
      </style>
    </head>
    <body>
      <div id="status">Initializing...</div>
      <div class="guide-box"></div>
      <video id="input_video" autoplay playsinline muted></video>
      <canvas id="output_canvas"></canvas>

      <script>
        const videoElement = document.getElementById('input_video');
        const canvasElement = document.getElementById('output_canvas');
        const canvasCtx = canvasElement.getContext('2d');
        const statusDiv = document.getElementById('status');
        
        let isCaptured = false;
        let consecutiveGoodFrames = 0;
        const REQUIRED_FRAMES = 5; 
        
        let state = "LOOK_STRAIGHT"; 
        let blinkDetected = false;

        function updateStatus(msg) {
            statusDiv.innerText = msg;
        }

        function distance(p1, p2) {
            return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
        }

        function getEAR(landmarks, eye) {
            const top = eye === 'left' ? 159 : 386;
            const bottom = eye === 'left' ? 145 : 374;
            const left = eye === 'left' ? 33 : 362;
            const right = eye === 'left' ? 133 : 263;

            const v = distance(landmarks[top], landmarks[bottom]);
            const h = distance(landmarks[left], landmarks[right]);
            return v / h;
        }

        function onResults(results) {
          if (isCaptured) return;
          
          canvasCtx.save();
          canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
          canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);
          
          if (results.multiFaceLandmarks && results.multiFaceLandmarks.length === 1) {
            const landmarks = results.multiFaceLandmarks[0];
            
            const faceHeight = distance(landmarks[10], landmarks[152]);
            
            if (faceHeight < 0.4) {
                updateStatus("Move Closer");
                consecutiveGoodFrames = 0;
            } else if (faceHeight > 0.8) {
                updateStatus("Move Back");
                consecutiveGoodFrames = 0;
            } else {
                const leftEAR = getEAR(landmarks, 'left');
                const rightEAR = getEAR(landmarks, 'right');
                const avgEAR = (leftEAR + rightEAR) / 2;

                if (state === "LOOK_STRAIGHT") {
                    updateStatus("Blink to Capture");
                    if (avgEAR < 0.18) { 
                         state = "BLINK_DETECTED";
                         blinkDetected = true;
                    }
                } else if (state === "BLINK_DETECTED") {
                    if (avgEAR > 0.25) { 
                        state = "CAPTURING";
                        updateStatus("Processing...");
                    }
                } else if (state === "CAPTURING") {
                    // 🚀 STREAMLINED: Capture immediately with minimal delay
                    capture();
                }
            }

          } else if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 1) {
              updateStatus("Only one person allowed");
              consecutiveGoodFrames = 0;
          } else {
              updateStatus("Face not found");
              consecutiveGoodFrames = 0;
          }
          canvasCtx.restore();
        }

        function capture() {
            if (isCaptured) return;
            isCaptured = true;
            const dataUrl = canvasElement.toDataURL('image/jpeg', 0.8);
            window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'CAPTURE',
                image: dataUrl
            }));
        }

        const faceMesh = new FaceMesh({locateFile: (file) => {
          return \`https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/\${file}\`;
        }});
        
        faceMesh.setOptions({
          maxNumFaces: 1,
          refineLandmarks: true,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5
        });
        
        faceMesh.onResults(onResults);

        // Check if getUserMedia is supported
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            updateStatus("Camera API not supported in this WebView");
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'ERROR', message: 'Camera API not supported' }));
        } else {
            const camera = new Camera(videoElement, {
            onFrame: async () => {
                await faceMesh.send({image: videoElement});
            },
            width: 640,
            height: 640
            });
            
            camera.start().then(() => {
                // 📏 FIX: Ensure canvas has matching dimensions immediately
                canvasElement.width = 640;
                canvasElement.height = 640;
                updateStatus("Align Face");
                window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'READY' }));
            })
            .catch(err => {
                updateStatus("Camera Error: " + err.message);
                window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'ERROR', message: err.message }));
            });
        }

      </script>
    </body>
    </html>
  `;

    const handleMessage = (event: any) => {
        try {
            const data = JSON.parse(event.nativeEvent.data);
            if (data.type === 'READY') {
                setLoading(false);
            }
            if (data.type === 'CAPTURE') {
                onCapture(data.image);
            }
            if (data.type === 'ERROR') {
                console.error("WebView Camera Error:", data.message);
                // Optionally handle fallback here
            }
        } catch (e) {
            console.error("JSON Parse Error", e);
        }
    };

    return (
        <View style={styles.container}>
            <WebView
                ref={webviewRef}
                source={{ html: htmlContent, baseUrl: 'https://localhost' }}
                style={styles.webview}
                javaScriptEnabled={true}
                domStorageEnabled={true}
                allowsInlineMediaPlayback={true}
                mediaPlaybackRequiresUserAction={false}
                onMessage={handleMessage}
                originWhitelist={['*']}
                // Important props for Android permissions
                androidLayerType="hardware"
                mixedContentMode="always"
                mediaCapturePermissionGrantType="grant"
                // @ts-ignore
                onPermissionRequest={(req) => {
                    req.grant(['camera', 'microphone']);
                }}
            />
            {loading && (
                <View style={styles.loading}>
                    <ActivityIndicator size="large" color="#2563eb" />
                    <Text style={{ color: 'white', marginTop: 10 }}>Loading Face Model...</Text>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'black'
    },
    webview: {
        flex: 1,
        backgroundColor: 'black'
    },
    loading: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'black',
        zIndex: 20
    }
});
