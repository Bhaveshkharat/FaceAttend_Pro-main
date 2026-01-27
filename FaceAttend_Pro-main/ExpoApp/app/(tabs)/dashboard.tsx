import { View, Text, StyleSheet, ScrollView, TouchableOpacity, AppState, Platform } from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { useEffect, useState, useCallback, useRef } from "react";
import { Ionicons } from "@expo/vector-icons";
import AppHeader from "@/components/ui/AppHeader";
import { api } from "@/services/api";
import { useAuth } from "@/context/AuthContext";

export default function Dashboard() {
  const router = useRouter();
  const { user } = useAuth();

  const [stats, setStats] = useState({
    totalEmployees: 0,
    present: 0,
    out: 0,
  });

  const loadStats = useCallback(async () => {
    try {
      const res = await api.get(`/attendance/stats/today?managerId=${user?._id}`);
      console.log("DASHBOARD STATS - Response:", res.data);
      setStats(res.data?.data || { totalEmployees: 0, present: 0, out: 0 });
    } catch (err) {
      console.log("DASHBOARD STATS ERROR:", err);
      setStats({ totalEmployees: 0, present: 0, out: 0 });
    }
  }, [user?._id]);

  useFocusEffect(
    useCallback(() => {
      loadStats();
    }, [loadStats])
  );

  // Refresh when component mounts and on visibility/app state change
  useEffect(() => {
    loadStats();
    
    // For web: Refresh when tab becomes visible
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const handleVisibilityChange = () => {
        if (!document.hidden) {
          loadStats();
        }
      };
      document.addEventListener('visibilitychange', handleVisibilityChange);
      return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }
    
    // For Android/iOS: Refresh when app comes to foreground
    if (Platform.OS !== 'web') {
      const subscription = AppState.addEventListener('change', (nextAppState) => {
        if (nextAppState === 'active') {
          loadStats();
        }
      });
      return () => subscription.remove();
    }
  }, [loadStats]);

  const analytics = [
    {
      title: "Total Employees",
      value: stats.totalEmployees,
      icon: "people",
      color: "#2563eb",
      bg: "#eff6ff",
    },
    {
      title: "Present Today",
      value: stats.present,
      icon: "checkmark-circle",
      color: "#059669",
      bg: "#ecfdf5",
    },
    {
      title: "Out / On Leave",
      value: stats.out,
      icon: "exit",
      color: "#dc2626",
      bg: "#fef2f2",
    },
  ];

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#f8fafc" }}>
      {/* Icon spacer below header */}
      <View style={styles.heroIcon}>
        <Ionicons name="finger-print-outline" size={42} color="#2563eb" />
      </View>

      {/* Analytics Cards */}
      <View style={styles.container}>
        {analytics.map((item, index) => (
          <View key={index} style={[styles.card, { backgroundColor: item.bg }]}>
            <View style={styles.cardHeader}>
              <Ionicons name={item.icon as any} size={24} color={item.color} />
              <Text style={styles.cardTitle}>{item.title}</Text>
            </View>
            <Text style={[styles.cardValue, { color: item.color }]}>
              {item.value || 0}
            </Text>
          </View>
        ))}

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionGrid}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push("/(attendance)/camera")}
          >
            <Ionicons name="camera" size={28} color="#fff" />
            <Text style={styles.actionText}>Scan Face</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: "#059669" }]}
            onPress={() => router.push("/(attendance)/register-employee")}
          >
            <Ionicons name="person-add" size={28} color="#fff" />
            <Text style={styles.actionText}>Add Employee</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  heroIcon: {
    alignItems: "center",
    paddingTop: 30,
    paddingBottom: 10,
  },
  container: {
    padding: 20,
  },
  card: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#4b5563",
    marginLeft: 10,
  },
  cardValue: {
    fontSize: 28,
    fontWeight: "800",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1f2937",
    marginVertical: 20,
  },
  actionGrid: {
    flexDirection: "row",
    gap: 15,
  },
  actionButton: {
    flex: 1,
    backgroundColor: "#2563eb",
    padding: 20,
    borderRadius: 16,
    alignItems: "center",
  },
  actionText: {
    color: "#fff",
    fontWeight: "700",
    marginTop: 8,
    fontSize: 14,
  },
});
