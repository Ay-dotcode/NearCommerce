import {
  apiClient,
  configureTokenRefresh,
  PortalRole,
  STORE_KEY,
  UserRole,
} from "@nearcommerce/api";

const ACCESS_TOKEN_KEY = "access_token";
const REFRESH_TOKEN_KEY = "refresh_token";
const USER_ROLE_KEY = "user_role";

export const getAccessToken = () => localStorage.getItem(ACCESS_TOKEN_KEY);
export const getRefreshToken = () => localStorage.getItem(REFRESH_TOKEN_KEY);
export const getUserRole = () =>
  localStorage.getItem(USER_ROLE_KEY) as UserRole | null;

export const persistSession = (
  token: string,
  role: PortalRole,
  storeId?: string,
  refreshToken?: string,
) => {
  localStorage.setItem(ACCESS_TOKEN_KEY, token);
  if (refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  localStorage.setItem(USER_ROLE_KEY, role);
  apiClient.defaults.headers.common.Authorization = `Bearer ${token}`;

  if (storeId) {
    localStorage.setItem(STORE_KEY, storeId);
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
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_ROLE_KEY);
  localStorage.removeItem(STORE_KEY);
  delete apiClient.defaults.headers.common.Authorization;
  delete apiClient.defaults.headers.common[STORE_KEY];
};

// Switches the store every owner request is scoped to (sent as the X-Store-ID header).
export const setActiveStoreId = (storeId: string) => {
  localStorage.setItem(STORE_KEY, storeId);
  apiClient.defaults.headers.common[STORE_KEY] = storeId;
};

// Signs out. The local session is cleared immediately, so the UI can leave the
// page at once; the returned promise settles when the server has been told (it
// resolves quietly if the server can't be reached).
export const signOutEverywhere = (): Promise<void> => {
  const refreshToken = getRefreshToken();
  clearSession();
  if (!refreshToken) return Promise.resolve();
  // The Authorization header is gone by now, which is fine: logout needs only the refresh token.
  return apiClient
    .post("/auth/logout", { refresh_token: refreshToken })
    .then(() => undefined)
    .catch(() => undefined);
};

// Keeps the owner signed in past the 15-minute access token: a 401 silently
// swaps the refresh token for a new pair. If that fails the session is cleared
// and `onExpired` runs (the app uses it to go back to the login page).
export const installTokenRefresh = (onExpired: () => void) => {
  configureTokenRefresh({
    getRefreshToken,
    onTokens: ({ accessToken, refreshToken }) => {
      localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
      localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
      apiClient.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
    },
    onAuthFailure: () => {
      clearSession();
      onExpired();
    },
  });
};
