import { apiClient } from "@nearcommerce/api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";

const TOKEN_KEY = "@nearcommerce_token";

interface AuthContextType {
  // The stored JWT access token, or null if not authenticated.
  token: string | null;
  // True while the initial token is being read from AsyncStorage.
  isLoading: boolean;
  // Persist a new token and attach it to the shared Axios instance.
  login: (token: string) => Promise<void>;
  // Remove the token and clear the Axios auth header.
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore persisted token on first mount
  useEffect(() => {
    let isMounted = true;
    AsyncStorage.getItem(TOKEN_KEY)
      .then((stored) => {
        if (isMounted && stored) {
          setToken(stored);
          apiClient.defaults.headers.common["Authorization"] =
            `Bearer ${stored}`;
        }
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const login = async (newToken: string) => {
    await AsyncStorage.setItem(TOKEN_KEY, newToken);
    apiClient.defaults.headers.common["Authorization"] = `Bearer ${newToken}`;
    setToken(newToken);
  };

  const logout = async () => {
    await AsyncStorage.removeItem(TOKEN_KEY);
    delete apiClient.defaults.headers.common["Authorization"];
    setToken(null);
  };

  return (
    <AuthContext.Provider value={{ token, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// Convenience hook — throws if used outside <AuthProvider>.
export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an <AuthProvider>");
  return ctx;
}
