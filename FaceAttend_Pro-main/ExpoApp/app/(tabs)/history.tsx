import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import { useEffect, useState, useCallback } from "react";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { api } from "@/services/api";

type AttendanceItem = {
  _id: string;
  user: {
    name: string;
    email: string;
  };
  checkIn: string;
  checkOut: string;
  status: string;
  leaveType?: string; // e.g. "First Half", "Second Half", "Full Day"
};

export default function History() {
  const [search, setSearch] = useState("");
  const [date, setDate] = useState(new Date());
  const [showCalendar, setShowCalendar] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<AttendanceItem[]>([]);

  // ✅ Use Local Date (Fixes UTC timezone bug)
  const formattedDate = `${date.getFullYear()}-${String(
    date.getMonth() + 1
  ).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

  const loadAttendance = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get(`/attendance?date=${formattedDate}`);
      setData(res.data?.data || []);
    } catch (err) {
      console.log("HISTORY ERROR:", err);
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [formattedDate]);

  const handleExport = async () => {
    if (data.length === 0) {
      Alert.alert("Info", "No data to export for this date");
      return;
    }

    try {
      setLoading(true);
      const url = `${api.defaults.baseURL}/attendance/export?date=${formattedDate}`;
      const fileName = `Attendance_${formattedDate}.xlsx`;
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;

      const { uri } = await FileSystem.downloadAsync(url, fileUri);

      if (Platform.OS === "android" || Platform.OS === "ios") {
        await Sharing.shareAsync(uri, {
          mimeType:
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          dialogTitle: "Export Attendance",
          UTI: "com.microsoft.excel.xlsx",
        });
      } else {
        Alert.alert("Success", "Excel file generated successfully");
      }
    } catch (err) {
      console.log("EXPORT ERROR:", err);
      Alert.alert("Error", "Failed to export attendance");
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadAttendance();
    }, [loadAttendance])
  );

  const filteredData = data.filter((item) =>
    item.user.name.toLowerCase().includes(search.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    if (status.includes("Present")) return styles.present;
    if (status.includes("half day")) return styles.half;
    if (status === "Absent") return styles.absent;
    return styles.neutral;
  };

  return (
    <View style={styles.container}>
      {/* Title */}
      <Text style={styles.title}>Attendance History</Text>

      {/* Filters */}
      <View style={styles.filterRow}>
        {/* Calendar */}
        <TouchableOpacity
          style={styles.dateBox}
          onPress={() => setShowCalendar(true)}
        >
          <Ionicons name="calendar" size={18} color="#2563eb" />
          <Text style={styles.dateText}>{formattedDate}</Text>
        </TouchableOpacity>

        {/* Search */}
        <View style={styles.searchBox}>
          <Ionicons name="search" size={16} color="#999" />
          <TextInput
            placeholder="Search employee"
            value={search}
            onChangeText={setSearch}
            style={styles.searchInput}
          />
        </View>

        {/* Export */}
        <TouchableOpacity style={styles.exportBtn} onPress={handleExport}>
          <Ionicons name="download" size={16} color="#fff" />
          <Text style={styles.exportText}>Export</Text>
        </TouchableOpacity>
      </View>

      {/* Calendar Picker */}
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

      {/* Table Header */}
      <View style={styles.tableHeader}>
        <Text style={styles.headerCell}>Name</Text>
        <Text style={styles.headerCell}>In</Text>
        <Text style={styles.headerCell}>Out</Text>
        <Text style={[styles.headerCell, { flex: 1.5 }]}>Status</Text>
      </View>

      {/* Data */}
      {loading ? (
        <ActivityIndicator style={{ marginTop: 30 }} />
      ) : (
        <FlatList
          data={filteredData}
          keyExtractor={(item) => item._id}
          ListEmptyComponent={
            <Text style={styles.empty}>No records found</Text>
          }
          renderItem={({ item }) => (
            <View style={styles.row}>
              <Text style={styles.cell}>{item.user.name}</Text>
              <Text style={styles.cell}>{item.checkIn || "--"}</Text>
              <Text style={styles.cell}>{item.checkOut || "--"}</Text>
              <Text
                style={[
                  styles.cell,
                  { flex: 1.5, fontSize: 13 },
                  getStatusColor(item.status),
                ]}
              >
                {item.status}
              </Text>
            </View>
          )}
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
  },
  filterRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 8,
  },
  dateBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#e0e7ff",
    padding: 10,
    borderRadius: 10,
  },
  dateText: {
    color: "#1e3a8a",
    fontWeight: "600",
  },
  searchBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  searchInput: {
    flex: 1,
    paddingLeft: 6,
  },
  exportBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2563eb",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 4,
  },
  exportText: {
    color: "#fff",
    fontWeight: "600",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#e5e7eb",
    paddingVertical: 10,
    borderRadius: 8,
  },
  headerCell: {
    flex: 1,
    fontWeight: "700",
    textAlign: "center",
  },
  row: {
    flexDirection: "row",
    backgroundColor: "#fff",
    marginTop: 6,
    paddingVertical: 12,
    borderRadius: 8,
    elevation: 1,
  },
  cell: {
    flex: 1,
    textAlign: "center",
    fontWeight: "500",
  },
  present: { color: "green" },
  absent: { color: "red" },
  half: { color: "#ca8a04" },
  neutral: { color: "#555" },
  empty: {
    textAlign: "center",
    marginTop: 40,
    color: "#777",
  },
});
