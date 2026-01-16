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
import { View, StyleSheet, Alert } from "react-native";
import CameraView from "@/components/ui/CameraView";
import { useState } from "react";
import { api } from "@/services/api";
import { useRouter } from "expo-router";

export default function AttendanceCamera() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleCapture = async (photo: { uri: string }) => {
    try {
      setLoading(true);

      const formData = new FormData();
      formData.append("image", {
        uri: photo.uri,
        name: "scan.jpg",
        type: "image/jpeg",
      } as any);

      const res = await api.post("/attendance/scan", formData, {
        headers: { "Content-Type": "multipart/form-data" },
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
        onCapture={handleCapture}
        disabled={loading}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "black",
  },
});
