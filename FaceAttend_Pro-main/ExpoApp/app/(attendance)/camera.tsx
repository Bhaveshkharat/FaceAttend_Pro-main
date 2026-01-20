import { View, StyleSheet, Alert, Text, ActivityIndicator } from "react-native";
import { useEffect, useState } from "react";
import { CameraView, useCameraPermissions } from "expo-camera";
import { api } from "@/services/api";
import { useRouter } from "expo-router";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import { useAuth } from "@/context/AuthContext";

export default function AttendanceCamera() {
  const router = useRouter();
  const { user } = useAuth();
  const [permission, requestPermission] = useCameraPermissions();
  const [loading, setLoading] = useState(false);
  const [cameraRef, setCameraRef] = useState<CameraView | null>(null);

  // 🔐 Request permission at runtime
  useEffect(() => {
    requestPermission();
  }, []);

  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionText}>
          Camera permission is required to mark attendance
        </Text>
      </View>
    );
  }

  const handleCapture = async () => {
    if (!cameraRef || loading) return;

    try {
      setLoading(true);

      const photo = await cameraRef.takePictureAsync({
        quality: 0.6,
        skipProcessing: true
      });

      // ⚡ OPTIMIZATION: Resize to 600px height for faster upload & processing
      const resized = await manipulateAsync(
        photo.uri,
        [{ resize: { height: 600 } }],
        { compress: 0.7, format: SaveFormat.JPEG }
      );

      const formData = new FormData();
      formData.append("image", {
        uri: resized.uri,
        name: "scan.jpg",
        type: "image/jpeg"
      } as any);

      const res = await api.post(`/attendance/scan?managerId=${user?._id}`, formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });

      if (res.data?.success) {
        Alert.alert(
          "Success",
          `${res.data?.name} checked ${res.data.type === "IN" ? "in" : "out"}`
        );
        router.replace("/(tabs)/dashboard");
      } else {
        Alert.alert("Failed", res.data?.message || "Face not recognized");
      }
    } catch (err: any) {
      console.log("SCAN ERROR:", err?.response?.data || err);
      Alert.alert("Error", "Failed to scan face");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <CameraView
        ref={(ref) => setCameraRef(ref)}
        style={styles.camera}
        facing="front"
      />

      {loading && (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color="#fff" />
        </View>
      )}

      {/* Auto capture / manual capture button can be added here */}
      <View style={styles.captureZone} onTouchEnd={handleCapture} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "black"
  },
  camera: {
    flex: 1
  },
  loader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center",
    justifyContent: "center"
  },
  captureZone: {
    position: "absolute",
    bottom: 40,
    alignSelf: "center",
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#ffffff"
  },
  permissionContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20
  },
  permissionText: {
    color: "#000",
    fontSize: 16,
    textAlign: "center"
  }
});
