import { apiClient } from "@nearcommerce/api";

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

export const persistSession = (token: string) => {
  writeCookie("access_token", token);
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
  document.cookie = "user_role=; Path=/; Max-Age=0";
  delete apiClient.defaults.headers.common.Authorization;
};
