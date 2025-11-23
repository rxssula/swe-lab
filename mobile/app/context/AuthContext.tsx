import React, { createContext, useContext, useEffect, useState } from "react";
import * as SecureStore from "expo-secure-store";
import { useRouter } from "expo-router";

type User = { id: number; username: string } | null;

type AuthContextType = {
  user: User;
  token: string | null;
  isLoading: boolean;
  signIn: (username: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // key used in secure store
  const TOKEN_KEY = "userToken";

  useEffect(() => {
    // load token on app start
    const init = async () => {
      try {
        const t = await SecureStore.getItemAsync(TOKEN_KEY);
        if (t) {
          setToken(t);
          // optionally verify token with backend or decode it
          // fetch user profile to verify and get user data:
          try {
            const resp = await fetch("https://swe-lab-1.onrender.com/auth/me/", {
              headers: { Authorization: `Bearer ${t}` },
            });
            if (resp.ok) { 
              const profile = await resp.json();
              setUser(profile);
            } else {
              // token invalid -> clear
              await SecureStore.deleteItemAsync(TOKEN_KEY);
              setToken(null);
              setUser(null);
            }
          } catch {
            // network error: you might still keep token but mark user null
            setUser(null);
          }
        }
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, []);

  const signIn = async (username: string, password: string) => {
    setIsLoading(true);   
    try {
      console.log("ios loading", username, password);
        const form = new URLSearchParams();
        form.append("username", username);
        form.append("password", password);
        console.log("ios loading2", username, password);
        const resp = await fetch("https://swe-lab-1.onrender.com/auth/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: form.toString(),
        });
        console.log(resp);
        if (!resp.ok) throw new Error("Login failed");
        const body = await resp.json();
        const t = body.access || body.token || body?.access_token;
        if (!t) throw new Error("No token in response");
        await SecureStore.setItemAsync(TOKEN_KEY, t);
        setToken(t);

        // fetch user profile
        const profileResp = await fetch("https://swe-lab-1.onrender.com/auth/me", {
            headers: { Authorization: `Bearer ${t}` },
        });
        if (profileResp.ok) {
            const profile = await profileResp.json();
            console.log("profile:", profile);
            setUser(profile);
            let role = profile.role;
            if (role == "consumer") {
              router.replace("/consumer/(tabs)/dashboard");
            } else {
              router.replace("/supplier/(tabs)/dashboard");
            }


            
        } else {
          console.log("profile not ok")
        }
      } finally {
          setIsLoading(false);
      }
  };

  const signOut = async () => {
    setIsLoading(true);
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    setToken(null);
    setUser(null);
    setIsLoading(false);
    router.replace("/auth/login");
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used within AuthProvider");
    return ctx;
};
