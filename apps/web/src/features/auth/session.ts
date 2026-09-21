import { apiClient } from "@nearcommerce/api";

export type PortalRole = "STORE_OWNER" | "SYSTEM_ADMIN";

const readCookie = (name: string) =>
  document.cookie
    .split("; ")
    .find((cookie) => cookie.startsWith(`${name}=`))
    ?.split("=")[1];

const writeCookie = (name: string, value: string) => {
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; SameSite=Strict${secure}`;
};

export const getAccessToken = () => readCookie("access_token");
export const getUserRole = () => readCookie("user_role");

export const persistSession = (
  token: string,
  role: PortalRole,
  storeId?: string,
) => {
  writeCookie("access_token", token);
  writeCookie("user_role", role);
  apiClient.defaults.headers.common.Authorization = `Bearer ${token}`;

  if (storeId) {
    localStorage.setItem("X-Store-ID", storeId);
    apiClient.defaults.headers.common["X-Store-ID"] = storeId;
  }
};

export const restoreSession = () => {
  const token = getAccessToken();
  const storeId = localStorage.getItem("X-Store-ID");

  if (token)
    apiClient.defaults.headers.common.Authorization = `Bearer ${token}`;
  if (storeId) apiClient.defaults.headers.common["X-Store-ID"] = storeId;
};

export const clearSession = () => {
  document.cookie = "access_token=; Path=/; Max-Age=0";
  document.cookie = "user_role=; Path=/; Max-Age=0";
  localStorage.removeItem("X-Store-ID");
  delete apiClient.defaults.headers.common.Authorization;
  delete apiClient.defaults.headers.common["X-Store-ID"];
};
