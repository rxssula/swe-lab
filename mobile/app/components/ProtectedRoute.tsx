import React from "react";
import { View, ActivityIndicator } from "react-native";
import { useAuth } from "../context/AuthContext";
import { useRouter } from "expo-router";

export const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isLoading, user } = useAuth();
  const router = useRouter();

  if (isLoading) return <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}><ActivityIndicator /></View>;

  if (!user) {
    // user not logged in -> redirect to login page
    router.replace("/auth/login");
    return null;
  }

  return <>{children}</>;
};
