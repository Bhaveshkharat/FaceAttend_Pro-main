console.log("REGISTER SCREEN: ATTENDANCE");

import { View, Text, TextInput, StyleSheet, Alert, ScrollView } from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import AppHeader from "@/components/ui/AppHeader";
import Button from "@/components/ui/Button";
import { api } from "@/services/api";
import { useAuth } from "@/context/AuthContext";

export default function RegisterEmployee() {
  const router = useRouter();
  const { user } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    // ✅ FRONTEND VALIDATION
    if (name.trim() === "" || email.trim() === "") {
      Alert.alert("Error", "Name and email are required");
      return;
    }

    try {
      setLoading(true);

      const res = await api.post("/auth/register-employee", {
        name: name.trim(),
        email: email.trim(),
        managerId: user?._id
      });

      const userId = res.data.user._id;

      router.push({
        pathname: "/(attendance)/face-register",
        params: {
          userId,
          name,
        },
      });
    } catch (err: any) {
      console.log("REGISTER ERROR:", err?.response?.data || err);
      Alert.alert(
        "Error",
        err?.response?.data?.message || "Failed to register employee"
      );
    } finally {
      setLoading(false); // ✅ VERY IMPORTANT (fixes stuck "Checking...")
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <AppHeader title="Register Employee" />

      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.label}>Employee Name</Text>
        <TextInput
          style={styles.input}
          value={name}                    // ✅ REQUIRED
          onChangeText={setName}          // ✅ REQUIRED
          placeholder="Enter full name"
        />

        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          value={email}                  // ✅ REQUIRED
          onChangeText={setEmail}        // ✅ REQUIRED
          placeholder="Enter email"
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <Button
          title={loading ? "Checking..." : "Next: Register Face"}
          onPress={handleRegister}
          disabled={loading}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  label: {
    fontSize: 14,
    marginBottom: 6,
    color: "#333",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
});
