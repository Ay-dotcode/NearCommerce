import {
  apiClient,
  createSessionManager,
  PortalRole,
  STORE_KEY,
  UserRole,
} from "@nearcommerce/api";

// The store-owner portal keeps its tokens in localStorage, together with the active store.
const session = createSessionManager(
  {
    get: (key) => localStorage.getItem(key),
    set: (key, value) => localStorage.setItem(key, value),
    remove: (key) => localStorage.removeItem(key),
  },
  {
    onClear: () => {
      localStorage.removeItem(STORE_KEY);
      delete apiClient.defaults.headers.common[STORE_KEY];
    },
  },
);

export const getAccessToken = session.getAccessToken;
export const getRefreshToken = session.getRefreshToken;
export const getUserRole = () => session.getRole() as UserRole | null;
export const clearSession = session.clear;
export const signOutEverywhere = session.signOutEverywhere;
export const installTokenRefresh = session.installTokenRefresh;

// Switches the store every owner request is scoped to (sent as the X-Store-ID header).
export const setActiveStoreId = (storeId: string) => {
  localStorage.setItem(STORE_KEY, storeId);
  apiClient.defaults.headers.common[STORE_KEY] = storeId;
};

export const persistSession = (
  token: string,
  role: PortalRole,
  storeId?: string,
  refreshToken?: string,
) => {
  session.saveTokens(token, refreshToken);
  session.saveRole(role);
  if (storeId) setActiveStoreId(storeId);
};

export const restoreSession = () => {
  session.restoreAuthHeader();
  const storeId = localStorage.getItem(STORE_KEY);
  if (storeId) apiClient.defaults.headers.common[STORE_KEY] = storeId;
};
