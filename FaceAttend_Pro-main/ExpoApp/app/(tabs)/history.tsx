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
  AppState,
} from "react-native";
import { useEffect, useState, useCallback } from "react";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { api } from "@/services/api";
import { useAuth } from "@/context/AuthContext";

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
  const { user } = useAuth();
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
      const res = await api.get(`/attendance?date=${formattedDate}&managerId=${user?._id}`);
      console.log("HISTORY - Date:", formattedDate, "Response:", res.data);
      setData(res.data?.data || []);
    } catch (err) {
      console.log("HISTORY ERROR:", err);
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [formattedDate, user?._id]);

  const handleExport = async () => {
    if (data.length === 0) {
      Alert.alert("Info", "No data to export for this date");
      return;
    }

    try {
      setLoading(true);
      const url = `${api.defaults.baseURL}/attendance/export?date=${formattedDate}&managerId=${user?._id}`;
      const fileName = `Attendance_${formattedDate}.xlsx`;

      // ✅ WEB: Download file directly
      if (Platform.OS === "web") {
        const response = await fetch(url);
        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = downloadUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(downloadUrl);
        Alert.alert("Success", "Excel file downloaded successfully");
      } else {
        // ✅ ANDROID/iOS: Use FileSystem and Sharing
        const fileUri = `${FileSystem.documentDirectory}${fileName}`;
        const { uri } = await FileSystem.downloadAsync(url, fileUri);
        await Sharing.shareAsync(uri, {
          mimeType:
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          dialogTitle: "Export Attendance",
          UTI: "com.microsoft.excel.xlsx",
        });
      }
    } catch (err) {
      console.log("EXPORT ERROR:", err);
      Alert.alert("Error", "Failed to export attendance");
    } finally {
      setLoading(false);
    }
  };

  // 🔄 Refresh when tab gains focus (important for Android)
  useFocusEffect(
    useCallback(() => {
      loadAttendance();
    }, [loadAttendance])
  );

  // 🔄 Load data on mount and whenever the selected date changes
  useEffect(() => {
    loadAttendance();
    
    // For web: Refresh when tab becomes visible
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const handleVisibilityChange = () => {
        if (!document.hidden) {
          loadAttendance();
        }
      };
      document.addEventListener('visibilitychange', handleVisibilityChange);
      return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }
    
    // For Android/iOS: Refresh when app comes to foreground
    if (Platform.OS !== 'web') {
      const subscription = AppState.addEventListener('change', (nextAppState) => {
        if (nextAppState === 'active') {
          loadAttendance();
        }
      });
      return () => subscription.remove();
    }
  }, [loadAttendance]);

  const filteredData = data.filter((item) =>
    item.user?.name?.toLowerCase().includes(search.toLowerCase()) ?? false
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
          onPress={() => {
            // On native, open the DateTimePicker modal
            if (Platform.OS !== "web") {
              setShowCalendar(true);
            }
          }}
        >
          <Ionicons name="calendar" size={18} color="#2563eb" />
          {Platform.OS === "web" ? (
            // 🖥️ Web: use native HTML date input for better browser support
            <input
              type="date"
              value={formattedDate}
              onChange={(e: any) => {
                const value = e.target.value;
                if (!value) return;
                const [year, month, day] = value.split("-");
                setDate(new Date(Number(year), Number(month) - 1, Number(day)));
              }}
              style={{
                border: "none",
                backgroundColor: "transparent",
                color: "#1e3a8a",
                fontWeight: 600,
                fontSize: 14,
                outline: "none",
                cursor: "pointer",
              } as any}
            />
          ) : (
            <Text style={styles.dateText}>{formattedDate}</Text>
          )}
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

      {/* Calendar Picker (native only) */}
      {showCalendar && Platform.OS !== "web" && (
        <DateTimePicker
          value={date}
          mode="date"
          display="default"
          onChange={(event, selectedDate) => {
            setShowCalendar(false);
            if (selectedDate) {
              setDate(selectedDate);
              // Force reload after date change
              setTimeout(() => {
                loadAttendance();
              }, 100);
            }
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
              <Text style={styles.cell}>{item.user?.name || "Unknown"}</Text>
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
    color: "#000",
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
    color: "#000",
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
    color: "#000",
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
    color: "#000",
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
