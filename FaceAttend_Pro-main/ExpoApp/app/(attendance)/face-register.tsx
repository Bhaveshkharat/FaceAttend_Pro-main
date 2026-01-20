import { View, Text, Alert, StyleSheet } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import FaceScanner from "@/components/FaceScanner";
import { api } from "@/services/api";
import * as FileSystem from "expo-file-system/legacy";
import { useAuth } from "@/context/AuthContext";

export default function FaceRegister() {
  const router = useRouter();
  const { user } = useAuth();
  const { userId, name } = useLocalSearchParams();

  const [loading, setLoading] = useState(false);

  if (!userId || !name) {
    Alert.alert("Error", "Missing employee data");
    router.back();
    return null;
  }

  const handleCapture = async (base64Image: string) => {
    try {
      setLoading(true);

      // ⚡ Convert Base64 to Local File for Multer
      const fileName = `face_${Date.now()}.jpg`;
      const fileUri = (FileSystem.cacheDirectory || "") + fileName;

      // Remove base64 prefix if exists
      const base64Data = base64Image.replace(/^data:image\/jpeg;base64,/, "");

      await FileSystem.writeAsStringAsync(fileUri, base64Data, {
        encoding: "base64", // Standard string for encoding
      });

      const formData = new FormData();

      formData.append("image", {
        uri: fileUri,
        name: fileName,
        type: "image/jpeg",
      } as any);

      formData.append("userId", userId as string);
      formData.append("name", name as string);
      if (user?._id) formData.append("managerId", user._id);

      console.log("Sending face registration request...");
      console.log("UserId:", userId);
      console.log("Name:", name);

      const res = await api.post("/face/register", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (res.data?.success) {
        Alert.alert("Success", "Face registered successfully");
        router.replace("/(tabs)/dashboard");
      } else {
        Alert.alert("Failed", res.data?.message || "Face registration failed");
      }
    } catch (err: any) {
      console.log("FACE REGISTER ERROR:", JSON.stringify(err?.response?.data || err, null, 2));
      console.log("ERROR MESSAGE:", err?.message);
      console.log("ERROR RESPONSE STATUS:", err?.response?.status);
      Alert.alert(
        "Failed",
        err?.response?.data?.message || err?.message || "Failed to register face"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Register Face</Text>

      <FaceScanner
        onCapture={handleCapture}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  title: {
    textAlign: "center",
    fontSize: 18,
    marginVertical: 10,
    fontWeight: "600",
  },
});
