import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useEffect, useState, useCallback } from "react";
import { useFocusEffect } from "expo-router";
import { api } from "@/services/api";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useRouter } from "expo-router";
import { useAuth } from "@/context/AuthContext";
import { Alert } from "react-native";

type Employee = {
  _id: string;
  name: string;
  email: string;
  present: number;
  absent: number;
};

export default function Profile() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { logout } = useAuth();
  const handleLogout = () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to logout?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Logout",
          style: "destructive",
          onPress: async () => {
            await logout();
            router.replace("/(auth)/login");
          },
        },
      ],
      { cancelable: true }
    );
  };

  const loadEmployees = useCallback(async () => {
    try {
      setLoading(true);

      // fetch employees
      const employeesRes = await api.get("/employees");

      // fetch attendance summary
      const summaryRes = await api.get("/attendance/summary");

      const summaryMap = summaryRes.data.data.reduce(
        (acc: any, curr: any) => {
          acc[curr.userId] = curr;
          return acc;
        },
        {}
      );

      const merged = employeesRes.data.data.map((emp: any) => ({
        ...emp,
        present: summaryMap[emp._id]?.present || 0,
        absent: summaryMap[emp._id]?.absent || 0,
      }));

      setEmployees(merged);
    } catch (err) {
      console.log("PROFILE ERROR:", err);
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadEmployees();
    }, [loadEmployees])
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Employees</Text>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={employees}
          keyExtractor={(item) => item._id}
          ListEmptyComponent={
            <Text style={styles.empty}>No employees found</Text>
          }
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.card}
              onPress={() =>
                router.push({
                  pathname: "/employee/[id]",
                  params: {
                    id: item._id,
                    name: item.name,
                    email: item.email,
                    present: item.present,
                    absent: item.absent,
                  },
                })
              }>
              <View>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.email}>{item.email}</Text>
              </View>

              <View style={styles.stats}>
                <View style={styles.statBox}>
                  <Text style={styles.statValue}>{item.present}</Text>
                  <Text style={styles.statLabel}>Present</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={[styles.statValue, { color: "red" }]}>{item.absent}</Text>
                  <Text style={styles.statLabel}>Absent</Text>
                </View>
              </View>

              <Ionicons name="chevron-forward" size={20} color="#999" />
            </TouchableOpacity>
          )}
        />
      )}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={18} color="#fff" />
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>

    </View>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
    padding: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 14,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    elevation: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: "600",
  },
  email: {
    fontSize: 13,
    color: "#666",
    marginTop: 2,
  },
  stats: {
    flexDirection: "row",
    marginLeft: "auto",
    marginRight: 8,
    gap: 12,
  },
  statBox: {
    alignItems: "center",
  },
  statValue: {
    fontWeight: "700",
    fontSize: 14,
  },
  statLabel: {
    fontSize: 11,
    color: "#666",
  },
  empty: {
    textAlign: "center",
    marginTop: 40,
    color: "#777",
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#dc2626",
    padding: 14,
    borderRadius: 12,
    marginTop: 20,
    gap: 6,
  },
  logoutText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
  },

});
