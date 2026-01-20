import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { useEffect, useState, useCallback } from "react";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { api } from "@/services/api";
import { useAuth } from "@/context/AuthContext";

type ExceptionItem = {
  name: string;
  type: "Leave" | "Late" | "Half Day" | "Absent" | string;
};

export default function Leave() {
  const { user } = useAuth();
  const [data, setData] = useState<ExceptionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [date, setDate] = useState(new Date());
  const [showCalendar, setShowCalendar] = useState(false);

  /* 
   * 🐛 FIX: toISOString() uses UTC. If user picks 00:00 Local, 
   * in +Timezones (e.g. India), it becomes Prev Day in UTC. 
   * We must use LOCAL date string [YYYY-MM-DD].
   */
  const formattedDate = `${date.getFullYear()}-${String(
    date.getMonth() + 1
  ).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

  const loadExceptions = useCallback(async () => {
    try {
      setLoading(true);
      // Backend handles ?date=YYYY-MM-DD
      const res = await api.get(`/attendance/exceptions/today?date=${formattedDate}&managerId=${user?._id}`);
      setData(res.data.data || []);
    } catch (err) {
      console.log("LEAVE PAGE ERROR:", err);
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [formattedDate]);

  useFocusEffect(
    useCallback(() => {
      loadExceptions();
    }, [loadExceptions])
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Daily Exceptions & Leave</Text>

      {/* 📅 Date Picker Row */}
      <View style={styles.filterRow}>
        <TouchableOpacity
          style={styles.dateBox}
          onPress={() => setShowCalendar(true)}
        >
          <Ionicons name="calendar" size={18} color="#2563eb" />
          <Text style={styles.dateText}>{formattedDate}</Text>
        </TouchableOpacity>
      </View>

      {showCalendar && (
        <DateTimePicker
          value={date}
          mode="date"
          display="default"
          onChange={(_, selectedDate) => {
            setShowCalendar(false);
            if (selectedDate) setDate(selectedDate);
          }}
        />
      )}

      {loading ? (
        <ActivityIndicator style={{ marginTop: 30 }} />
      ) : (
        <FlatList
          data={data}
          keyExtractor={(_, index) => index.toString()}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.name}>{item.name}</Text>
              <Text
                style={[
                  styles.status,
                  item.type.includes("Leave") && styles.leave,
                  item.type === "Late" && styles.late,
                  (item.type.includes("Half") || item.type.includes("half")) && styles.half,
                  item.type.includes("Absent") && styles.leave,
                ]}
              >
                {item.type}
              </Text>
            </View>
          )}
          ListEmptyComponent={
            <Text style={styles.empty}>All employees present! 🎉</Text>
          }
        />
      )}
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
    color: "#000",
  },
  filterRow: {
    flexDirection: "row",
    marginBottom: 16,
  },
  dateBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#e0e7ff",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  dateText: {
    color: "#1e3a8a",
    fontWeight: "600",
    fontSize: 16,
  },
  card: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 10,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
  },
  name: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  status: {
    fontSize: 14,
    fontWeight: "700",
  },
  leave: {
    color: "red",
  },
  late: {
    color: "#2563eb",
  },
  half: {
    color: "#ca8a04",
  },
  empty: {
    textAlign: "center",
    marginTop: 40,
    color: "#777",
    fontSize: 16,
  },
});
