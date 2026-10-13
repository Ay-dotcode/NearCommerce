import { apiClient, createSessionManager } from "@nearcommerce/api";

// The admin console keeps its tokens in cookies (SameSite=Strict, Secure over https).
const readCookie = (name: string) =>
  document.cookie
    .split("; ")
    .find((c) => c.startsWith(`${name}=`))
    ?.split("=")[1];

const session = createSessionManager({
  get: (key) => {
    const raw = readCookie(key);
    return raw ? decodeURIComponent(raw) : null;
  },
  set: (key, value) => {
    const secure = window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `${key}=${encodeURIComponent(value)}; Path=/; SameSite=Strict${secure}`;
  },
  remove: (key) => {
    document.cookie = `${key}=; Path=/; Max-Age=0`;
  },
});

export const getAccessToken = session.getAccessToken;
export const getRefreshToken = session.getRefreshToken;
export const getUserRole = session.getRole;
export const restoreSession = session.restoreAuthHeader;
export const clearSession = session.clear;
export const signOutEverywhere = session.signOutEverywhere;
export const installTokenRefresh = session.installTokenRefresh;

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

// Only System Admins can sign in here, so the role is always the same.
export const persistSession = (token: string, refreshToken?: string) => {
  session.saveTokens(token, refreshToken);
  session.saveRole("SYSTEM_ADMIN");
};

export { apiClient };
