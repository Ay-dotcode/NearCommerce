import {
  clearSession,
  getRefreshToken,
  installTokenRefresh,
  persistSession,
  signOutEverywhere,
} from "@/features/auth/session";
import { apiClient, configureTokenRefresh } from "@nearcommerce/api";

jest.mock("@nearcommerce/api", () => ({
  UserRole: { STORE_OWNER: "STORE_OWNER" },
  STORE_KEY: "x-store-id",
  apiClient: {
    post: jest.fn(),
    defaults: { headers: { common: {} as Record<string, string> } },
  },
  configureTokenRefresh: jest.fn(),
}));
const post = apiClient.post as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
  clearSession();
});

it("stores the refresh token with the session and clears it again", () => {
  persistSession("access", "STORE_OWNER" as never, "store-1", "refresh");
  expect(localStorage.getItem("access_token")).toBe("access");
  expect(getRefreshToken()).toBe("refresh");
  clearSession();
  expect(getRefreshToken()).toBeNull();
  expect(localStorage.getItem("access_token")).toBeNull();
});

it("signOutEverywhere revokes the refresh token and clears locally", async () => {
  persistSession("access", "STORE_OWNER" as never, undefined, "refresh");
  post.mockResolvedValue({});
  await signOutEverywhere();
  expect(post).toHaveBeenCalledWith("/auth/logout", {
    refresh_token: "refresh",
  });
  expect(getRefreshToken()).toBeNull();
});

it("signOutEverywhere still clears locally when the server is unreachable", async () => {
  persistSession("access", "STORE_OWNER" as never, undefined, "refresh");
  post.mockRejectedValue(new Error("offline"));
  await signOutEverywhere();
  expect(localStorage.getItem("access_token")).toBeNull();
});

it("signOutEverywhere skips the server call when there is no refresh token", async () => {
  persistSession("access", "STORE_OWNER" as never);
  await signOutEverywhere();
  expect(post).not.toHaveBeenCalled();
  expect(localStorage.getItem("access_token")).toBeNull();
});

describe("installTokenRefresh", () => {
  const handlers = () => (configureTokenRefresh as jest.Mock).mock.calls[0][0];

  it("saves rotated tokens", () => {
    installTokenRefresh(jest.fn());
    handlers().onTokens({ accessToken: "a2", refreshToken: "r2" });
    expect(localStorage.getItem("access_token")).toBe("a2");
    expect(getRefreshToken()).toBe("r2");
    expect(apiClient.defaults.headers.common.Authorization).toBe("Bearer a2");
  });

  it("clears the session and notifies when refresh fails", () => {
    persistSession("a", "STORE_OWNER" as never, undefined, "r");
    const onExpired = jest.fn();
    installTokenRefresh(onExpired);
    handlers().onAuthFailure();
    expect(localStorage.getItem("access_token")).toBeNull();
    expect(onExpired).toHaveBeenCalled();
  });

  it("reads the current refresh token on demand", () => {
    installTokenRefresh(jest.fn());
    persistSession("a", "STORE_OWNER" as never, undefined, "r9");
    expect(handlers().getRefreshToken()).toBe("r9");
  });
});
