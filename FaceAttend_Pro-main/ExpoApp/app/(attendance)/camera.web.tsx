import { useState } from "react";
import { View, Text, StyleSheet, Alert } from "react-native";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/services/api";

export default function AttendanceCameraWeb() {
  const { user } = useAuth();
  const [loading, setLoading] = useState<"in" | "out" | null>(null);

  const handleManualCheckIn = async () => {
    if (!user?._id) {
      Alert.alert("Error", "User not found. Please log in again.");
      return;
    }

    try {
      setLoading("in");
      const res = await api.post("/attendance/manual/check-in", {
        userId: user._id,
      });

      if (res.data?.success) {
        Alert.alert("Success", `Checked in at ${res.data.time}`);
      } else {
        Alert.alert("Failed", res.data?.message || "Unable to check in");
      }
    } catch (err: any) {
      console.log("MANUAL CHECK-IN ERROR:", err?.response?.data || err);
      Alert.alert(
        "Error",
        err?.response?.data?.message || "Failed to check in"
      );
    } finally {
      setLoading(null);
    }
  };

  const handleManualCheckOut = async () => {
    if (!user?._id) {
      Alert.alert("Error", "User not found. Please log in again.");
      return;
    }

    try {
      setLoading("out");
      const res = await api.post("/attendance/manual/check-out", {
        userId: user._id,
      });

      if (res.data?.success) {
        Alert.alert("Success", `Checked out at ${res.data.time}`);
      } else {
        Alert.alert("Failed", res.data?.message || "Unable to check out");
      }
    } catch (err: any) {
      console.log("MANUAL CHECK-OUT ERROR:", err?.response?.data || err);
      Alert.alert(
        "Error",
        err?.response?.data?.message || "Failed to check out"
      );
    } finally {
      setLoading(null);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Web Attendance</Text>
      <Text style={styles.subtitle}>
        Camera is disabled on web. Use the buttons below to check in and out
        manually.
      </Text>

      <View style={styles.buttonsRow}>
        <Button
          label={loading === "in" ? "Checking in..." : "Check In"}
          onPress={handleManualCheckIn}
          disabled={loading !== null}
        />
        <Button
          label={loading === "out" ? "Checking out..." : "Check Out"}
          onPress={handleManualCheckOut}
          variant="secondary"
          disabled={loading !== null}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f9fafb",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 8,
    color: "#111827",
  },
  subtitle: {
    fontSize: 14,
    textAlign: "center",
    color: "#4b5563",
    maxWidth: 360,
    marginBottom: 32,
  },
  buttonsRow: {
    flexDirection: "row",
    columnGap: 16,
    rowGap: 16,
    flexWrap: "wrap",
    justifyContent: "center",
  },
});


