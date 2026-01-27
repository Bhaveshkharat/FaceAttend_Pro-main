import { Tabs, Redirect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AppHeader from "@/components/ui/AppHeader";
import { useAuth } from "@/context/AuthContext";

export default function TabLayout() {
  const { user, loading } = useAuth();

  // Wait until auth state is restored
  if (loading) return null;

  // If user is not logged in, don't allow access to tabs
  if (!user) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <Tabs
      screenOptions={{
        header: () => <AppHeader />, // ✅ GLOBAL HEADER
        tabBarActiveTintColor: "#2563eb",
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="history"
        options={{
          title: "History",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar-outline" size={size} color={color} />
          ),
        }}
      />



      <Tabs.Screen
        name="leave"
        options={{
          title: "Leave",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="alert-circle-outline" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people-outline" size={size} color={color} />
          ),
        }}
      />

    </Tabs>
  );
}
