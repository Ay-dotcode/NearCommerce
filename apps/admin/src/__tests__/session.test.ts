import {
  getRefreshToken,
  installTokenRefresh,
  persistSession,
  signOutEverywhere,
} from "@/session";
import { apiClient, configureTokenRefresh } from "@nearcommerce/api";

jest.mock("@nearcommerce/api", () => ({
  apiClient: {
    post: jest.fn(),
    defaults: { headers: { common: {} as Record<string, string> } },
  },
  configureTokenRefresh: jest.fn(),
}));
const post = apiClient.post as jest.Mock;

const clearCookies = () =>
  document.cookie.split("; ").forEach((c) => {
    document.cookie = `${c.split("=")[0]}=; Path=/; Max-Age=0`;
  });

beforeEach(() => {
  jest.clearAllMocks();
  clearCookies();
});

it("keeps the refresh token with the session", () => {
  persistSession("access", "refresh/with+chars");
  expect(getRefreshToken()).toBe("refresh/with+chars");
});

it("sign out clears cookies at once and revokes the token on the server", async () => {
  persistSession("access", "refresh");
  post.mockResolvedValue({});
  const done = signOutEverywhere();
  expect(document.cookie).not.toContain("access_token=access");
  await done;
  expect(post).toHaveBeenCalledWith("/auth/logout", {
    refresh_token: "refresh",
  });
  expect(getRefreshToken()).toBeNull();
});

it("sign out tolerates an unreachable server", async () => {
  persistSession("access", "refresh");
  post.mockRejectedValue(new Error("offline"));
  await expect(signOutEverywhere()).resolves.toBeUndefined();
});

it("stores rotated tokens and expires the session on failure", () => {
  const onExpired = jest.fn();
  installTokenRefresh(onExpired);
  const handlers = (configureTokenRefresh as jest.Mock).mock.calls[0][0];

  handlers.onTokens({ accessToken: "a2", refreshToken: "r2" });
  expect(getRefreshToken()).toBe("r2");
  expect(apiClient.defaults.headers.common.Authorization).toBe("Bearer a2");

  handlers.onAuthFailure();
  expect(getRefreshToken()).toBeNull();
  expect(onExpired).toHaveBeenCalled();
});
