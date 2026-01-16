import { CameraView as ExpoCamera, useCameraPermissions } from "expo-camera";
import { View, TouchableOpacity, Text, StyleSheet, ActivityIndicator } from "react-native";
import { useRef } from "react";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";

type Props = {
  onCapture: (photo: { uri: string }) => void;
  disabled?: boolean;
};

export default function CameraView({ onCapture, disabled = false }: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<any>(null);

  if (!permission) {
    // Camera permissions are still loading.
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  if (!permission.granted) {
    // Camera permissions are not granted yet.
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.message}>We need your permission to show the camera</Text>
        <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
          <Text style={styles.buttonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const takePhoto = async () => {
    if (!cameraRef.current || disabled) return;

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.6,
        skipProcessing: true,
      });

      // ⚡ OPTIMIZATION: Resize to 600px height
      const resized = await manipulateAsync(
        photo.uri,
        [{ resize: { height: 600 } }],
        { compress: 0.7, format: SaveFormat.JPEG }
      );

      onCapture(resized);
    } catch (err) {
      console.log("CAMERA ERROR:", err);
    }
  };

  return (
    <View style={styles.container}>
      <ExpoCamera
        key={permission.granted ? "granted" : "denied"}
        ref={cameraRef}
        style={styles.camera}
        facing="front"
        ratio="16:9"
      />

      <TouchableOpacity
        style={[styles.button, disabled && styles.buttonDisabled]}
        onPress={takePhoto}
        disabled={disabled}
      >
        <Text style={styles.buttonText}>
          {disabled ? "Processing..." : "Capture Face"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
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
  camera: { flex: 1 },
  button: {
    position: "absolute",
    bottom: 30,
    alignSelf: "center",
    backgroundColor: "#2563eb",
    paddingVertical: 14,
    paddingHorizontal: 28,
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
