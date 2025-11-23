import React, { createContext, useContext, useEffect, useState } from "react";
import * as SecureStore from "expo-secure-store";
import { useRouter } from "expo-router";

type User = { 
  id: number;
  email: string;
  role: string;
  userType: string;
  phone: string;
} | null;

type AuthContextType = {
  user: User;
  token: string | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
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
  const USER_KEY = "userInfo";

  useEffect(() => {
    const init = async () => {
      try {
        const t = await SecureStore.getItemAsync(TOKEN_KEY);
        const u = await SecureStore.getItemAsync(USER_KEY);
        if (t) {
          setToken(t);
          try {
            const resp = await fetch("https://swe-lab-1.onrender.com/auth/me", {
              headers: { Authorization: `Bearer ${t}` },
            });
            if (resp.ok && u) { 
              setUser(JSON.parse(u));
            } else {
              await SecureStore.deleteItemAsync(TOKEN_KEY);
              setToken(null);
              setUser(null);
            }
          } catch {
            setUser(null);
          }
        }
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, []);

  const signIn = async (email: string, password: string) => {
    setIsLoading(true);   
    try {
        const form = new URLSearchParams();
        form.append("username", email);
        form.append("password", password);
        const resp = await fetch("https://swe-lab-1.onrender.com/auth/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: form.toString(),
        });
        if (!resp.ok) throw new Error("Login failed");

        const body = await resp.json();
        const t = body.access || body.token || body?.access_token;
        console.log(body);
        const u = {
          id: body.consumer_id ? body.consumer_id : body.supplier_id,
          email: body.user.email,
          role: body.role,
          userType: body.user_type,
          phone: body.user.phone_number,
        };
        
        if (!t) throw new Error("No token in response");
        await SecureStore.setItemAsync(TOKEN_KEY, t);
        await SecureStore.setItemAsync(USER_KEY, JSON.stringify(u));
        setToken(t);
        setUser(u);

        router.replace("/(tabs)/dashboard");
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
