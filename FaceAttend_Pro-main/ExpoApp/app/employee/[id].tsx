import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { api } from "@/services/api";

type AttendanceRecord = {
  _id: string;
  date: string;
  checkIn: string;
  checkOut: string;
  status: string;
};

export default function EmployeeDetail() {
  const { id, name, email, present, absent } = useLocalSearchParams();

  const [loading, setLoading] = useState(false);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);

  const loadEmployeeAttendance = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/attendance/employee/${id}`);
      setRecords(res.data.data || []);
    } catch (err) {
      console.log("EMPLOYEE DETAIL ERROR:", err);
      setRecords([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEmployeeAttendance();
  }, []);

  return (
    <View style={styles.container}>
      <FlatList
        data={records}
        keyExtractor={(item) => item._id}
        ListHeaderComponent={
          <>
            {/* Employee Info */}
            <View style={styles.card}>
              <Text style={styles.name}>{name}</Text>
              <Text style={styles.email}>{email}</Text>

              <View style={styles.stats}>
                <View style={styles.statBox}>
                  <Text style={styles.statValue}>{present}</Text>
                  <Text style={styles.statLabel}>Present</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={[styles.statValue, { color: "red" }]}>{absent || 0}</Text>
                  <Text style={styles.statLabel}>Absent</Text>
                </View>
              </View>
            </View>

            {/* Attendance History */}
            <Text style={styles.sectionTitle}>Attendance History</Text>
          </>
        }
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text style={styles.cell}>{item.date}</Text>
            <Text style={styles.cell}>{item.checkIn || "--"}</Text>
            <Text style={styles.cell}>{item.checkOut || "--"}</Text>
            <Text style={styles.cell}>{item.status}</Text>
          </View>
        )}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator style={{ marginTop: 20 }} />
          ) : (
            <Text style={styles.empty}>No attendance records</Text>
          )
        }
      />
    </View>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
    padding: 16,
  },
  card: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    elevation: 1,
  },
  name: {
    fontSize: 18,
    fontWeight: "700",
  },
  email: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
  },
  stats: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 16,
  },
  statBox: {
    alignItems: "center",
  },
  statValue: {
    fontSize: 16,
    fontWeight: "700",
  },
  statLabel: {
    fontSize: 12,
    color: "#666",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 8,
  },
  row: {
    flexDirection: "row",
    backgroundColor: "#fff",
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 6,
    elevation: 1,
  },
  cell: {
    flex: 1,
    textAlign: "center",
    fontSize: 13,
  },
  empty: {
    textAlign: "center",
    marginTop: 30,
    color: "#777",
  },
});
