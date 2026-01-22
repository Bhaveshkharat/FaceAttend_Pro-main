import { View, Text, Alert, StyleSheet, Platform } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import FaceScanner from "@/components/FaceScanner";
import { api } from "@/services/api";
import * as FileSystem from "expo-file-system/legacy";
import { useAuth } from "@/context/AuthContext";
import { WebAlert } from "@/components/ui/WebAlert";

export default function FaceRegister() {
  const router = useRouter();
  const { user } = useAuth();
  const { userId, name } = useLocalSearchParams();

  const [loading, setLoading] = useState(false);
  const [webAlert, setWebAlert] = useState<{ visible: boolean; title: string; message: string }>({
    visible: false,
    title: "",
    message: "",
  });

  if (!userId || !name) {
    Alert.alert("Error", "Missing employee data");
    router.back();
    return null;
  }

  const handleCapture = async (base64Image: string) => {
    try {
      setLoading(true);

      const fileName = `face_${Date.now()}.jpg`;
      const formData = new FormData();

      // ✅ WEB: Convert base64 to Blob directly
      if (Platform.OS === "web") {
        // Remove base64 prefix
        const base64Data = base64Image.replace(/^data:image\/jpeg;base64,/, "");
        
        // Convert base64 to binary string
        const binaryString = atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        
        // Create Blob and append to FormData
        const blob = new Blob([bytes], { type: "image/jpeg" });
        formData.append("image", blob, fileName);
      } else {
        // ✅ ANDROID: Use FileSystem as before
        const fileUri = (FileSystem.cacheDirectory || "") + fileName;
        const base64Data = base64Image.replace(/^data:image\/jpeg;base64,/, "");

        await FileSystem.writeAsStringAsync(fileUri, base64Data, {
          encoding: "base64",
        });

        formData.append("image", {
          uri: fileUri,
          name: fileName,
          type: "image/jpeg",
        } as any);
      }

      formData.append("userId", userId as string);
      formData.append("name", name as string);
      if (user?._id) formData.append("managerId", user._id);

      console.log("Sending face registration request...");
      console.log("UserId:", userId);
      console.log("Name:", name);

      const res = await api.post("/face/register", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      console.log("Face registration response:", res.data);

      if (res.data?.success) {
        console.log("Showing success alert: Face registered successfully");
        
        // ✅ WEB: Use custom WebAlert component
        if (Platform.OS === "web") {
          setWebAlert({
            visible: true,
            title: "Success",
            message: "Face registered successfully",
          });
        } else {
          // ✅ ANDROID: Use React Native Alert
          Alert.alert("Success", "Face registered successfully", [
            { text: "OK", onPress: () => router.replace("/(tabs)/dashboard") },
          ], { cancelable: false });
        }
      } else {
        if (Platform.OS === "web") {
          setWebAlert({
            visible: true,
            title: "Failed",
            message: res.data?.message || "Face registration failed",
          });
        } else {
          Alert.alert("Failed", res.data?.message || "Face registration failed");
        }
      }
    } catch (err: any) {
      console.log("FACE REGISTER ERROR:", JSON.stringify(err?.response?.data || err, null, 2));
      console.log("ERROR MESSAGE:", err?.message);
      console.log("ERROR RESPONSE STATUS:", err?.response?.status);
      
      const errorMessage = err?.response?.data?.message || err?.message || "Failed to register face";
      
      if (Platform.OS === "web") {
        setWebAlert({
          visible: true,
          title: "Failed",
          message: errorMessage,
        });
      } else {
        Alert.alert("Failed", errorMessage);
      }
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

      {/* ✅ WEB: Custom Alert Modal */}
      {Platform.OS === "web" && (
        <WebAlert
          visible={webAlert.visible}
          title={webAlert.title}
          message={webAlert.message}
          onClose={() => {
            setWebAlert({ visible: false, title: "", message: "" });
            if (webAlert.title === "Success") {
              router.replace("/(tabs)/dashboard");
            }
          }}
        />
      )}
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
