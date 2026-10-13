import { apiClient } from "./client";
import { configureTokenRefresh } from "./tokenRefresh";

export interface SessionStorage {
  get(key: string): string | null;
  set(key: string, value: string): void;
  remove(key: string): void;
}

export const ACCESS_TOKEN_KEY = "access_token";
export const REFRESH_TOKEN_KEY = "refresh_token";
export const USER_ROLE_KEY = "user_role";

export interface SessionManagerOptions {
  onClear?: () => void;
}

export function createSessionManager(
  storage: SessionStorage,
  { onClear }: SessionManagerOptions = {},
) {
  const setAuthHeader = (token: string) => {
    apiClient.defaults.headers.common.Authorization = `Bearer ${token}`;
  };

  const getAccessToken = () => storage.get(ACCESS_TOKEN_KEY);
  const getRefreshToken = () => storage.get(REFRESH_TOKEN_KEY);
  const getRole = () => storage.get(USER_ROLE_KEY);

  const saveTokens = (accessToken: string, refreshToken?: string) => {
    storage.set(ACCESS_TOKEN_KEY, accessToken);
    if (refreshToken) storage.set(REFRESH_TOKEN_KEY, refreshToken);
    setAuthHeader(accessToken);
  };

  const saveRole = (role: string) => storage.set(USER_ROLE_KEY, role);

  const restoreAuthHeader = () => {
    const token = getAccessToken();
    if (token) setAuthHeader(token);
  };

  const clear = () => {
    storage.remove(ACCESS_TOKEN_KEY);
    storage.remove(REFRESH_TOKEN_KEY);
    storage.remove(USER_ROLE_KEY);
    delete apiClient.defaults.headers.common.Authorization;
    onClear?.();
  };

  const signOutEverywhere = (): Promise<void> => {
    const refreshToken = getRefreshToken();
    clear();
    if (!refreshToken) return Promise.resolve();
    return apiClient
      .post("/auth/logout", { refresh_token: refreshToken })
      .then(() => undefined)
      .catch(() => undefined);
  };

  const installTokenRefresh = (onExpired: () => void) => {
    configureTokenRefresh({
      getRefreshToken,
      onTokens: ({ accessToken, refreshToken }) =>
        saveTokens(accessToken, refreshToken),
      onAuthFailure: () => {
        clear();
        onExpired();
      },
    });
  };

  return {
    getAccessToken,
    getRefreshToken,
    getRole,
    saveTokens,
    saveRole,
    restoreAuthHeader,
    clear,
    signOutEverywhere,
    installTokenRefresh,
  };
}
