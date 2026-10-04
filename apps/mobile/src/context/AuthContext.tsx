import { apiClient, configureTokenRefresh } from "@nearcommerce/api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";

const TOKEN_KEY = "@nearcommerce_token";
const REFRESH_TOKEN_KEY = "@nearcommerce_refresh_token";

interface AuthContextType {
  // The stored JWT access token, or null if not authenticated.
  token: string | null;
  // True while the initial token is being read from AsyncStorage.
  isLoading: boolean;
  // Persist a new token and attach it to the shared Axios instance.
  login: (token: string, refreshToken?: string) => Promise<void>;
  // Sign out: revoke the refresh token on the server (best effort), then clear local state.
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

  const applyAccessToken = (value: string) => {
    apiClient.defaults.headers.common["Authorization"] = `Bearer ${value}`;
    setToken(value);
  };

  const clearLocal = async () => {
    await AsyncStorage.removeMany([TOKEN_KEY, REFRESH_TOKEN_KEY]);
    delete apiClient.defaults.headers.common["Authorization"];
    setToken(null);
  };

  // Silent refresh: a 401 swaps the refresh token for a new pair. If that fails the
  // user is signed out, and the app shell sends them to the login screen.
  useEffect(() => {
    configureTokenRefresh({
      getRefreshToken: () => AsyncStorage.getItem(REFRESH_TOKEN_KEY),
      onTokens: async ({ accessToken, refreshToken }) => {
        await AsyncStorage.setMany({
          [TOKEN_KEY]: accessToken,
          [REFRESH_TOKEN_KEY]: refreshToken,
        });
        applyAccessToken(accessToken);
      },
      onAuthFailure: clearLocal,
    });
    return () => configureTokenRefresh(null);
    // The handlers only use stable setters and module-level objects.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = async (newToken: string, refreshToken?: string) => {
    await AsyncStorage.setItem(TOKEN_KEY, newToken);
    if (refreshToken)
      await AsyncStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    applyAccessToken(newToken);
  };

  const logout = async () => {
    const refreshToken = await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
    await clearLocal();
    if (refreshToken)
      await apiClient
        .post("/auth/logout", { refresh_token: refreshToken })
        .catch(() => undefined);
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
