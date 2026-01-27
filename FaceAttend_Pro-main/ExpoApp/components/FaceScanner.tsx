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
    const containerRef = useRef<HTMLElement | null>(null);
    const [loading, setLoading] = useState(true);
    const [hasPermission, setHasPermission] = useState<boolean | null>(null);
    const [status, setStatus] = useState("Initializing...");

    useEffect(() => {
        // ✅ WEB: Skip expo-camera permission check, browser handles it
        if (Platform.OS === 'web') {
            setHasPermission(true);
            return;
        }

        // ✅ ANDROID: Request expo-camera permissions
        (async () => {
            const { status } = await Camera.requestCameraPermissionsAsync();
            setHasPermission(status === 'granted');
        })();
    }, []);

    // ✅ WEB: Direct browser implementation (no WebView)
    useEffect(() => {
        if (Platform.OS !== 'web' || !hasPermission) return;

        let video: HTMLVideoElement | null = null;
        let canvas: HTMLCanvasElement | null = null;
        let faceMesh: any = null;
        let camera: any = null;
        let stream: MediaStream | null = null;
        let isCaptured = false;
        let state = "LOOK_STRAIGHT";
        let statusDiv: HTMLDivElement | null = null;

        // Small delay to ensure DOM is ready
        const timer = setTimeout(() => {
            const container = containerRef.current;
            if (!container) {
                console.error('Container ref not available');
                setStatus('Error: Container not found');
                setLoading(false);
                return;
            }

        const initWebCamera = async () => {
            try {
                // Create video and canvas elements
                video = document.createElement('video');
                video.id = 'input_video';
                video.autoplay = true;
                video.playsInline = true;
                video.muted = true;
                video.style.cssText = 'position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; transform: scaleX(-1);';

                canvas = document.createElement('canvas');
                canvas.id = 'output_canvas';
                canvas.style.cssText = 'position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; transform: scaleX(-1);';

                statusDiv = document.createElement('div');
                statusDiv.id = 'status';
                statusDiv.style.cssText = 'position: absolute; top: 20px; left: 50%; transform: translateX(-50%); background: rgba(0,0,0,0.6); color: white; padding: 8px 16px; border-radius: 20px; font-family: sans-serif; font-size: 16px; z-index: 10; text-align: center;';
                statusDiv.textContent = 'Loading MediaPipe...';

                const guideBox = document.createElement('div');
                guideBox.className = 'guide-box';
                guideBox.style.cssText = 'position: absolute; width: 280px; height: 350px; border: 2px solid rgba(255, 255, 255, 0.5); border-radius: 150px; z-index: 5; box-shadow: 0 0 0 1000px rgba(0,0,0,0.5); top: 50%; left: 50%; transform: translate(-50%, -50%);';

                container.appendChild(statusDiv);
                container.appendChild(guideBox);
                container.appendChild(video);
                container.appendChild(canvas);

                // Load MediaPipe scripts
                // Check if running in Chrome extension (multiple detection methods)
                const isChromeExtension = 
                    window.location.protocol === 'chrome-extension:' ||
                    window.location.protocol === 'chrome-extension://' ||
                    typeof (window as any).chrome !== 'undefined' && 
                    typeof (window as any).chrome.runtime !== 'undefined' ||
                    window.location.href.startsWith('chrome-extension://');
                
                const scripts = isChromeExtension
                    ? [
                        '/mediapipe/camera_utils.js',
                        '/mediapipe/control_utils.js',
                        '/mediapipe/drawing_utils.js',
                        '/mediapipe/face_mesh.js',
                      ]
                    : [
                        'https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js',
                        'https://cdn.jsdelivr.net/npm/@mediapipe/control_utils/control_utils.js',
                        'https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js',
                        'https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/face_mesh.js',
                      ];

                await Promise.all(
                    scripts.map(
                        (src) =>
                            new Promise<void>((resolve, reject) => {
                                if ((window as any)[src.split('/').pop()?.split('.')[0] || '']) {
                                    resolve();
                                    return;
                                }
                                const script = document.createElement('script');
                                script.src = src;
                                script.crossOrigin = 'anonymous';
                                script.onload = () => resolve();
                                script.onerror = () => reject(new Error(`Failed to load ${src}`));
                                document.head.appendChild(script);
                            })
                    )
                );

                const FaceMesh = (window as any).FaceMesh;
                const Camera = (window as any).Camera;

                if (!FaceMesh || !Camera) {
                    throw new Error('MediaPipe libraries not loaded');
                }

                const ctx = canvas.getContext('2d');
                if (!ctx) throw new Error('Canvas context not available');

                // Request camera
                stream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: 'user', width: 640, height: 640 },
                });

                video.srcObject = stream;
                await video.play();

                // Set canvas dimensions
                canvas.width = 640;
                canvas.height = 640;
                
                // Ensure video is playing
                video.addEventListener('loadedmetadata', () => {
                    if (video) {
                        console.log('Web: Video metadata loaded, dimensions:', video.videoWidth, 'x', video.videoHeight);
                    }
                });

                const distance = (p1: any, p2: any) => {
                    return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
                };

                const getEAR = (landmarks: any[], eye: 'left' | 'right') => {
                    const top = eye === 'left' ? 159 : 386;
                    const bottom = eye === 'left' ? 145 : 374;
                    const left = eye === 'left' ? 33 : 362;
                    const right = eye === 'left' ? 133 : 263;
                    const v = distance(landmarks[top], landmarks[bottom]);
                    const h = distance(landmarks[left], landmarks[right]);
                    return v / h;
                };

                const capture = () => {
                    if (isCaptured || !canvas || !video || !ctx) {
                        console.log('Web: Capture blocked - isCaptured:', isCaptured, 'canvas:', !!canvas, 'video:', !!video, 'ctx:', !!ctx);
                        return;
                    }
                    
                    isCaptured = true;
                    
                    try {
                        // Ensure video is ready
                        if (video.readyState < 2) {
                            console.log('Web: Video not ready, waiting...');
                            video.addEventListener('loadeddata', () => {
                                performCapture();
                            }, { once: true });
                            return;
                        }
                        
                        performCapture();
                    } catch (err: any) {
                        console.error('Web: Capture error:', err);
                        isCaptured = false; // Reset to allow retry
                        if (statusDiv) statusDiv.textContent = 'Capture failed, try again';
                        setStatus('Capture failed, try again');
                    }
                    
                    function performCapture() {
                        if (!ctx || !canvas || !video) {
                            console.error('Web: Cannot capture - missing elements');
                            isCaptured = false;
                            return;
                        }
                        
                        try {
                            // Draw current video frame to canvas for capture
                            ctx.save();
                            ctx.clearRect(0, 0, canvas.width, canvas.height);
                            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                            
                            // Capture the image from canvas
                            const base64Image = canvas.toDataURL('image/jpeg', 0.8);
                            console.log('Web: Image captured successfully, base64 length:', base64Image.length);
                            
                            if (!base64Image || base64Image.length < 100) {
                                throw new Error('Failed to capture image - invalid data');
                            }
                            
                            // Update status
                            if (statusDiv) statusDiv.textContent = 'Sending...';
                            setStatus('Sending...');
                            
                            // Stop camera processing after a short delay to ensure image is captured
                            setTimeout(() => {
                                if (camera) {
                                    try {
                                        camera.stop();
                                    } catch (e) {
                                        console.log('Error stopping camera:', e);
                                    }
                                }
                                if (stream) {
                                    stream.getTracks().forEach((track: MediaStreamTrack) => track.stop());
                                }
                            }, 500);
                            
                            // Call the onCapture callback
                            onCapture(base64Image);
                            ctx.restore();
                        } catch (err: any) {
                            console.error('Web: PerformCapture error:', err);
                            isCaptured = false;
                            if (statusDiv) statusDiv.textContent = 'Capture failed, try again';
                            setStatus('Capture failed, try again');
                        }
                    }
                };

                const onResults = (results: any) => {
                    if (isCaptured || !ctx || !canvas) {
                        // Stop processing if already captured or missing elements
                        return;
                    }
                    
                    ctx.save();
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);

                    if (results.multiFaceLandmarks && results.multiFaceLandmarks.length === 1) {
                        const landmarks = results.multiFaceLandmarks[0];
                        const faceHeight = distance(landmarks[10], landmarks[152]);

                        if (faceHeight < 0.4) {
                            if (statusDiv) statusDiv.textContent = 'Move Closer';
                            setStatus('Move Closer');
                            state = "LOOK_STRAIGHT"; // Reset state
                        } else if (faceHeight > 0.8) {
                            if (statusDiv) statusDiv.textContent = 'Move Back';
                            setStatus('Move Back');
                            state = "LOOK_STRAIGHT"; // Reset state
                        } else {
                            const leftEAR = getEAR(landmarks, 'left');
                            const rightEAR = getEAR(landmarks, 'right');
                            const avgEAR = (leftEAR + rightEAR) / 2;

                            if (state === "LOOK_STRAIGHT") {
                                if (statusDiv) statusDiv.textContent = 'Blink to Capture';
                                setStatus('Blink to Capture');
                                if (avgEAR < 0.18) {
                                    state = "BLINK_DETECTED";
                                    console.log('Web: Blink detected');
                                }
                            } else if (state === "BLINK_DETECTED") {
                                if (avgEAR > 0.25) {
                                    state = "CAPTURING";
                                    if (statusDiv) statusDiv.textContent = 'Processing...';
                                    setStatus('Processing...');
                                    console.log('Web: Eyes opened, capturing...');
                                    // Capture immediately
                                    setTimeout(() => capture(), 100);
                                }
                            }
                        }
                    } else if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 1) {
                        if (statusDiv) statusDiv.textContent = 'Only one person allowed';
                        setStatus('Only one person allowed');
                        state = "LOOK_STRAIGHT"; // Reset state
                    } else {
                        if (statusDiv) statusDiv.textContent = 'Face not found';
                        setStatus('Face not found');
                        state = "LOOK_STRAIGHT"; // Reset state
                    }
                    ctx.restore();
                };

                faceMesh = new FaceMesh({
                    locateFile: (file: string) => {
                        return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
                    },
                });

                faceMesh.setOptions({
                    maxNumFaces: 1,
                    refineLandmarks: true,
                    minDetectionConfidence: 0.5,
                    minTrackingConfidence: 0.5,
                });

                faceMesh.onResults(onResults);

                camera = new Camera(video, {
                    onFrame: async () => {
                        await faceMesh.send({ image: video });
                    },
                    width: 640,
                    height: 640,
                });

                await camera.start();
                if (statusDiv) statusDiv.textContent = 'Align Face';
                setStatus('Align Face');
                setLoading(false);
            } catch (err: any) {
                console.error('Web camera init error:', err);
                setStatus(`Error: ${err.message || 'Camera access denied'}`);
                setLoading(false);
            }
        };

        initWebCamera();

        }, 100);

        return () => {
            clearTimeout(timer);
            if (stream) {
                stream.getTracks().forEach((track) => track.stop());
            }
            if (camera) {
                camera.stop();
            }
            const container = containerRef.current;
            if (container) {
                container.innerHTML = '';
            }
        };
    }, [hasPermission, onCapture]);

    if (hasPermission === null) {
        return <View style={styles.loading}><ActivityIndicator /></View>;
    }
    if (hasPermission === false) {
        return <View style={styles.loading}><Text style={{ color: 'white' }}>No Camera Permission</Text></View>;
    }

    // ✅ WEB: Render directly in DOM
    if (Platform.OS === 'web') {
        return (
            <View style={styles.container}>
                <View
                    // @ts-ignore - React Native Web ref callback
                    ref={(node: any) => {
                        if (node && Platform.OS === 'web') {
                            // Get the actual DOM element
                            containerRef.current = node._nativeNode || node;
                        }
                    }}
                    style={styles.webContainer}
                />
                {loading && (
                    <View style={styles.loading}>
                        <ActivityIndicator size="large" color="#2563eb" />
                        <Text style={{ color: 'white', marginTop: 10 }}>{status}</Text>
                    </View>
                )}
            </View>
        );
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
            const base64Image = canvasElement.toDataURL('image/jpeg', 0.5);
            window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'CAPTURE',
                image: base64Image
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
    webContainer: {
        flex: 1,
        backgroundColor: 'black',
        // @ts-ignore - web-specific styles
        position: 'relative',
        overflow: 'hidden',
    },
    loading: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'black',
        zIndex: 20
    }
});
