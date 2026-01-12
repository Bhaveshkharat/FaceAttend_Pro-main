import { View, Text, Alert, StyleSheet } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import CameraView from "@/components/ui/CameraView";
import { api } from "@/services/api";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";

export default function FaceRegister() {
  const router = useRouter();
  const { userId, name } = useLocalSearchParams();

  const [loading, setLoading] = useState(false);

  if (!userId || !name) {
    Alert.alert("Error", "Missing employee data");
    router.back();
    return null;
  }

  const handleCapture = async (photo: any) => {
    try {
      setLoading(true);

      // ⚡ OPTIMIZATION: Resize image to 600px height for faster AI processing
      const resized = await manipulateAsync(
        photo.uri,
        [{ resize: { height: 600 } }],
        { compress: 0.7, format: SaveFormat.JPEG }
      );

      const formData = new FormData();

      formData.append("image", {
        uri: resized.uri,
        name: "face.jpg",
        type: "image/jpeg",
      } as any);

      formData.append("userId", userId as string);
      formData.append("name", name as string);

      const res = await api.post("/face/register", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (res.data?.success) {
        Alert.alert("Success", "Face registered successfully");
        router.replace("/(tabs)/dashboard");
      } else {
        Alert.alert("Failed", res.data?.message || "Face registration failed");
      }



      // Go back to dashboard (not employee register!)
      router.replace("/(tabs)/dashboard");
    } catch (err: any) {
      console.log("FACE REGISTER ERROR:", err?.response?.data || err);
      Alert.alert(
        "Failed",
        err?.response?.data?.message || "Failed to register face"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Register Face</Text>

      <CameraView
        onCapture={handleCapture}
        disabled={loading}
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
