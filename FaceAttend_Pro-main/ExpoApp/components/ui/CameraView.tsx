import { CameraView as ExpoCamera } from "expo-camera";
import { View, TouchableOpacity, Text, StyleSheet } from "react-native";
import { useRef } from "react";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";

type Props = {
  onCapture: (photo: { uri: string }) => void;
  disabled?: boolean;
};

export default function CameraView({ onCapture, disabled = false }: Props) {
  const cameraRef = useRef<any>(null);

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
        ref={cameraRef}
        style={styles.camera}
        facing="front"
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
  buttonDisabled: {
    backgroundColor: "#9ca3af",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
