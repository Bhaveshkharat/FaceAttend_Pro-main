import { View, StyleSheet, Alert, Text, ActivityIndicator } from "react-native";
import { useState } from "react";
import { api } from "@/services/api";
import { useRouter } from "expo-router";
import * as FileSystem from "expo-file-system/legacy";
import { useAuth } from "@/context/AuthContext";
import FaceScanner from "@/components/FaceScanner";

export default function AttendanceCamera() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleCapture = async (base64Image: string) => {
    try {
      setLoading(true);

      // ⚡ Convert Base64 to Local File for Multer
      const fileName = `scan_${Date.now()}.jpg`;
      const fileUri = (FileSystem.cacheDirectory || "") + fileName;

      // Remove base64 prefix if exists
      const base64Data = base64Image.replace(/^data:image\/jpeg;base64,/, "");

      await FileSystem.writeAsStringAsync(fileUri, base64Data, {
        encoding: "base64",
      });

      const formData = new FormData();
      formData.append("image", {
        uri: fileUri,
        name: fileName,
        type: "image/jpeg",
      } as any);

      const res = await api.post(`/attendance/scan?managerId=${user?._id}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (res.data?.success) {
        Alert.alert(
          "Success",
          `${res.data?.name} checked ${res.data.type === "IN" ? "in" : "out"}`,
          [{ text: "OK", onPress: () => router.replace("/(tabs)/dashboard") }]
        );
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
      <FaceScanner onCapture={handleCapture} />

      {loading && (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={{ color: "#fff", marginTop: 10 }}>Processing...</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "black",
  },
  loader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 100,
  },
});
