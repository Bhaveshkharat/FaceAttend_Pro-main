import { View, StyleSheet, Alert, Text, ActivityIndicator, Platform } from "react-native";
import { useState } from "react";
import { api } from "@/services/api";
import { useRouter } from "expo-router";
import * as FileSystem from "expo-file-system/legacy";
import { useAuth } from "@/context/AuthContext";
import FaceScanner from "@/components/FaceScanner";
import { WebAlert } from "@/components/ui/WebAlert";

export default function AttendanceCamera() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState<"scanning" | false>(false);
  const [webAlert, setWebAlert] = useState<{ visible: boolean; title: string; message: string }>({
    visible: false,
    title: "",
    message: "",
  });

  // ✅ WEB & ANDROID: Face Scan
  const handleCapture = async (base64Image: string) => {
    try {
      setLoading("scanning");

      const fileName = `scan_${Date.now()}.jpg`;
      const formData = new FormData();

      // ✅ WEB: Convert base64 to Blob directly
      if (Platform.OS === "web") {
        const base64Data = base64Image.replace(/^data:image\/jpeg;base64,/, "");
        const binaryString = atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
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

      const res = await api.post(`/attendance/scan?managerId=${user?._id}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      console.log("Attendance scan response:", res.data);

      if (res.data?.success) {
        const userName = res.data?.name || "User";
        const action = res.data.type === "IN" ? "in" : "out";
        const message = `${userName} checked ${action}`;
        
        console.log("Showing success alert:", message);
        
        // ✅ WEB: Use custom WebAlert component
        if (Platform.OS === "web") {
          setWebAlert({
            visible: true,
            title: "Success",
            message: message,
          });
        } else {
          // ✅ ANDROID: Use React Native Alert
          Alert.alert(
            "Success",
            message,
            [{ text: "OK", onPress: () => router.replace("/(tabs)/dashboard") }],
            { cancelable: false }
          );
        }
      } else {
        if (Platform.OS === "web") {
          setWebAlert({
            visible: true,
            title: "Failed",
            message: res.data?.message || "Face not recognized",
          });
        } else {
          Alert.alert("Failed", res.data?.message || "Face not recognized");
        }
      }
    } catch (err: any) {
      console.log("SCAN ERROR:", err?.response?.data || err);
      if (Platform.OS === "web") {
        setWebAlert({
          visible: true,
          title: "Error",
          message: "Failed to scan face",
        });
      } else {
        Alert.alert("Error", "Failed to scan face");
      }
    } finally {
      setLoading(false);
    }
  };

  // ✅ WEB & ANDROID: Show Face Scanner (both use face scanning now)
  return (
    <View style={styles.container}>
      <FaceScanner onCapture={handleCapture} />

      {loading === "scanning" && (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={{ color: "#fff", marginTop: 10 }}>Processing...</Text>
        </View>
      )}

      {/* ✅ WEB: Custom Alert Modal */}
      {Platform.OS === "web" && (
        <WebAlert
          visible={webAlert.visible}
          title={webAlert.title}
          message={webAlert.message}
          onClose={() => {
            setWebAlert({ visible: false, title: "", message: "" });
            if (webAlert.title === "Success") {
              // Navigate back to dashboard - useEffect will refresh data
              router.replace("/(tabs)/dashboard");
            }
          }}
        />
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
