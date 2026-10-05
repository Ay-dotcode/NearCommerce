import { apiClient, configureTokenRefresh } from "@nearcommerce/api";

const readCookie = (name: string) =>
  document.cookie
    .split("; ")
    .find((c) => c.startsWith(`${name}=`))
    ?.split("=")[1];

const writeCookie = (name: string, value: string) => {
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; SameSite=Strict${secure}`;
};

export const getAccessToken = () => readCookie("access_token");
export const getUserRole = () => readCookie("user_role");

// The signed-in admin's id, read from the access token (display logic only;
// the server never trusts this).
export const getCurrentUserId = () => {
  const token = getAccessToken();
  if (!token) return null;
  try {
    const payload = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return (JSON.parse(atob(payload)) as { id?: string }).id ?? null;
  } catch {
    return null;
  }
};
export const getRefreshToken = () => {
  const raw = readCookie("refresh_token");
  return raw ? decodeURIComponent(raw) : null;
};

export const persistSession = (token: string, refreshToken?: string) => {
  writeCookie("access_token", token);
  if (refreshToken) writeCookie("refresh_token", refreshToken);
  writeCookie("user_role", "SYSTEM_ADMIN");
  apiClient.defaults.headers.common.Authorization = `Bearer ${token}`;
};

export const restoreSession = () => {
  const token = getAccessToken();
  if (token)
    apiClient.defaults.headers.common.Authorization = `Bearer ${token}`;
};

export const clearSession = () => {
  document.cookie = "access_token=; Path=/; Max-Age=0";
  document.cookie = "refresh_token=; Path=/; Max-Age=0";
  document.cookie = "user_role=; Path=/; Max-Age=0";
  delete apiClient.defaults.headers.common.Authorization;
};

// Signs out now; the server is told in the background (and quietly ignored if unreachable).
export const signOutEverywhere = (): Promise<void> => {
  const refreshToken = getRefreshToken();
  clearSession();
  if (!refreshToken) return Promise.resolve();
  return apiClient
    .post("/auth/logout", { refresh_token: refreshToken })
    .then(() => undefined)
    .catch(() => undefined);
};

// Swaps the refresh token for a new pair when the 15-minute access token expires.
export const installTokenRefresh = (onExpired: () => void) => {
  configureTokenRefresh({
    getRefreshToken,
    onTokens: ({ accessToken, refreshToken }) => {
      writeCookie("access_token", accessToken);
      writeCookie("refresh_token", refreshToken);
      apiClient.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
    },
    onAuthFailure: () => {
      clearSession();
      onExpired();
    },
  });
};
