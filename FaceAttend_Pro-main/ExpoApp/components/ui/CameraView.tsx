import React, { useState } from "react";
import { View, StyleSheet, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { useCameraPermissions } from "expo-camera";
import FaceScanner from "../FaceScanner";

type Props = {
  onCapture: (photo: { uri: string }) => void;
  disabled?: boolean;
};

export default function CameraView({ onCapture, disabled = false }: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraActive, setCameraActive] = useState(false);

  if (!permission) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.message}>We need your permission to show the camera</Text>
        <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
          <Text style={styles.buttonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleCapture = (base64Image: string) => {
    // Convert base64 to a uri-like object if needed, or just pass uri
    // FaceScanner returns data:image/jpeg;base64,...
    onCapture({ uri: base64Image });
    setCameraActive(false);
  };

  return (
    <View style={styles.container}>
      {cameraActive ? (
        <FaceScanner onCapture={handleCapture} />
      ) : (
        <View style={styles.centerContainer}>
          <Text style={styles.previewText}>Click below to start Face Scan</Text>
          <TouchableOpacity
            style={[styles.button, disabled && styles.buttonDisabled]}
            onPress={() => setCameraActive(true)}
            disabled={disabled}
          >
            <Text style={styles.buttonText}>
              {disabled ? "Processing..." : "Start Face Scan"}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  previewText: {
    fontSize: 18,
    marginBottom: 20,
    color: '#374151'
  },
  message: {
    textAlign: "center",
    marginBottom: 20,
    fontSize: 16,
    color: "#374151",
  },
  button: {
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
