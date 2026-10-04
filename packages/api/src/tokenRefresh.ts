import type { AxiosError, AxiosRequestConfig } from "axios";
import { apiClient } from "./client";

export interface RefreshedTokens {
  accessToken: string;
  refreshToken: string;
}

export interface TokenRefreshHandlers {
  /** The stored refresh token, or null when the user has none. */
  getRefreshToken: () => string | null | Promise<string | null>;
  /** Persist the new pair. Must make `accessToken` the one future requests send. */
  onTokens: (tokens: RefreshedTokens) => void | Promise<void>;
  /** The refresh token is missing, expired, revoked or the account is suspended. */
  onAuthFailure: () => void | Promise<void>;
}

type RetryableConfig = AxiosRequestConfig & {
  _retried?: boolean;
  _skipRefresh?: boolean;
};

// Requests to these must never trigger a refresh: a 401 there is a real answer
// (wrong password, bad token), and refreshing would loop.
const AUTH_PATHS = [
  "/auth/login",
  "/auth/register",
  "/auth/refresh",
  "/auth/logout",
  "/auth/forgot-password",
  "/auth/reset-password",
];

const isAuthPath = (url?: string) =>
  Boolean(url && AUTH_PATHS.some((p) => url.includes(p)));

let handlers: TokenRefreshHandlers | null = null;
let inflight: Promise<string | null> | null = null;
let interceptorId: number | null = null;

async function refreshOnce(): Promise<string | null> {
  // Several requests can fail with 401 together; they all wait for one refresh.
  if (inflight) return inflight;
  const current = handlers;
  if (!current) return null;

  inflight = (async () => {
    try {
      const refreshToken = await current.getRefreshToken();
      if (!refreshToken) {
        await current.onAuthFailure();
        return null;
      }
      try {
        const res = await apiClient.post<{
          access_token: string;
          refresh_token: string;
        }>("/auth/refresh", { refresh_token: refreshToken }, {
          _skipRefresh: true,
        } as RetryableConfig);
        await current.onTokens({
          accessToken: res.data.access_token,
          refreshToken: res.data.refresh_token,
        });
        return res.data.access_token;
      } catch (error) {
        const status = (error as AxiosError).response?.status;
        // A rejected token ends the session. A network error does not: the
        // user is just offline and the refresh token is still good.
        if (status === 400 || status === 401 || status === 403)
          await current.onAuthFailure();
        return null;
      }
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

/**
 * Turns on silent token refresh for the shared client: a 401 triggers one
 * refresh, then the original request is retried once with the new token.
 * Pass null to turn it off (used by tests).
 */
export function configureTokenRefresh(next: TokenRefreshHandlers | null) {
  handlers = next;
  inflight = null;
  if (interceptorId !== null) {
    apiClient.interceptors.response.eject(interceptorId);
    interceptorId = null;
  }
  if (!next) return;

  interceptorId = apiClient.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const original = error.config as RetryableConfig | undefined;
      if (
        error.response?.status !== 401 ||
        !original ||
        original._retried ||
        original._skipRefresh ||
        isAuthPath(original.url)
      )
        return Promise.reject(error);

      const accessToken = await refreshOnce();
      if (!accessToken) return Promise.reject(error);

      original._retried = true;
      original.headers = {
        ...(original.headers as Record<string, unknown>),
        Authorization: `Bearer ${accessToken}`,
      } as never;
      return apiClient.request(original);
    },
  );
}
