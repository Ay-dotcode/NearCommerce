import { STORE_KEY } from "@/constants/routes";
import { apiClient, PortalRole, UserRole } from "@nearcommerce/api";
export { UserRole } from "@nearcommerce/api";
export type { PortalRole } from "@nearcommerce/api";

const ACCESS_TOKEN_KEY = "access_token";
const USER_ROLE_KEY = "user_role";

export const getAccessToken = () => localStorage.getItem(ACCESS_TOKEN_KEY);
export const getUserRole = () =>
  localStorage.getItem(USER_ROLE_KEY) as UserRole | null;

export const persistSession = (
  token: string,
  role: PortalRole,
  storeId?: string,
) => {
  localStorage.setItem(ACCESS_TOKEN_KEY, token);
  localStorage.setItem(USER_ROLE_KEY, role);
  apiClient.defaults.headers.common.Authorization = `Bearer ${token}`;

  if (storeId) {
    localStorage.setItem(STORE_KEY, storeId);
    apiClient.defaults.headers.common[STORE_KEY] = storeId;
    apiClient.defaults.headers.common[STORE_KEY] = storeId;
  }
};

export const restoreSession = () => {
  const token = getAccessToken();
  const storeId = localStorage.getItem(STORE_KEY);

  if (token)
    apiClient.defaults.headers.common.Authorization = `Bearer ${token}`;
  if (storeId) apiClient.defaults.headers.common[STORE_KEY] = storeId;
};

export const clearSession = () => {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(USER_ROLE_KEY);
  localStorage.removeItem(STORE_KEY);
  delete apiClient.defaults.headers.common.Authorization;
  delete apiClient.defaults.headers.common[STORE_KEY];
};
