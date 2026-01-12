import { View, Button } from "react-native";
import { useRouter } from "expo-router";

export default function AttendanceHome() {
  const router = useRouter();

  return (
    <View style={{ flex: 1, justifyContent: "center", padding: 20 }}>
      <Button
        title="Register New Face"
        onPress={() => router.push("./(attendance)/register")}
      />

      <View style={{ height: 20 }} />

      <Button
        title="Mark Attendance"
        onPress={() => router.push("/(attendance)/camera")}
      />
    </View>
  );
}
