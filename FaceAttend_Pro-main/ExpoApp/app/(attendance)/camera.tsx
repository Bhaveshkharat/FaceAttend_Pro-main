// import { View, Text, StyleSheet } from "react-native";
// import CameraView from "@/components/ui/CameraView";
// import { api } from "@/services/api";
// import { useState } from "react";

// export default function CameraScreen() {
//   const [message, setMessage] = useState("Scan your face");

//   const handleCapture = async (uri: string) => {
//     const formData = new FormData();
//     formData.append("image", {
//       uri,
//       name: "face.jpg",
//       type: "image/jpeg",
//     } as any);

//     try {
//       const res = await api.post("/attendance/scan", formData, {
//         headers: { "Content-Type": "multipart/form-data" },
//       });

//       setMessage(`${res.data.user} ✔`);
//     } catch {
//       setMessage("Face not recognized ❌");
//     }

//     setTimeout(() => setMessage("Scan your face"), 2500);
//   };

//   return (
//     <View style={{ flex: 1 }}>
//       <CameraView onCapture={handleCapture} />
//       <View style={styles.overlay}>
//         <Text style={styles.text}>{message}</Text>
//       </View>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   overlay: {
//     position: "absolute",
//     bottom: 40,
//     alignSelf: "center",
//     backgroundColor: "#000",
//     padding: 16,
//     borderRadius: 12,
//   },
//   text: { color: "#fff", fontSize: 18, fontWeight: "600" },
// });
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { CameraView as ExpoCamera, useCameraPermissions } from "expo-camera";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import { useRef, useState } from "react";
import { api } from "@/services/api";
import { useRouter } from "expo-router";

export default function AttendanceCamera() {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<any>(null);
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  if (!permission) {
    // Camera permissions are still loading.
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  if (!permission.granted) {
    // Camera permissions are not granted yet.
    return (
      <View style={styles.container}>
        <View style={styles.centerContainer}>
          <Text style={styles.message}>We need your permission to show the camera</Text>
          <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
            <Text style={styles.buttonText}>Grant Permission</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const scanFace = async () => {
    if (!cameraRef.current || loading) return;

    try {
      setLoading(true);

      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.6,
        skipProcessing: true,
      });

      // ⚡ OPTIMIZATION: Resize image to 400px height for even faster AI processing
      const resized = await manipulateAsync(
        photo.uri,
        [{ resize: { height: 400 } }],
        { compress: 0.4, format: SaveFormat.JPEG }
      );

      const formData = new FormData();
      formData.append("image", {
        uri: resized.uri,
        name: "scan.jpg",
        type: "image/jpeg",
      } as any);

      const res = await api.post("/attendance/scan", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (res.data?.success) {
        alert(
          `${res.data?.name} checked ${res.data.type === "IN" ? "in" : "out"}`
        );
      } else {
        alert(res.data?.message || "Face not recognized");
      }

    } catch (err) {
      console.log("SCAN ERROR:", err);
      alert("Failed to scan face");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* CAMERA */}
      <ExpoCamera
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing="front"
      />

      {/* OVERLAY */}
      <View style={styles.overlay} pointerEvents="box-none">
        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={scanFace}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? "Scanning..." : "Scan your face"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "black",
  },

  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#fff",
  },

  message: {
    textAlign: "center",
    marginBottom: 20,
    fontSize: 16,
    color: "#374151",
  },

  overlay: {
    position: "absolute",
    bottom: 40,
    width: "100%",
    alignItems: "center",
    zIndex: 10,           // 🔥 ensures button is above camera
  },

  button: {
    backgroundColor: "#2563eb",
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 30,
  },

  permissionButton: {
    backgroundColor: "#2563eb",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },

  buttonDisabled: {
    backgroundColor: "#9ca3af",
  },

  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
