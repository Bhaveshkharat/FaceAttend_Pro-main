import { Redirect } from "expo-router";
import { useAuth } from "@/context/AuthContext";

export default function Index() {
  const { user, loading } = useAuth();

  // While we are restoring the user from storage, render nothing.
  if (loading) {
    return null;
  }

  // If not logged in → go to login screen
  if (!user) {
    return <Redirect href="/(auth)/login" />;
  }

  // If logged in → go straight to dashboard tabs
  return <Redirect href="/(tabs)/dashboard" />;
}

