import { apiClient, configureTokenRefresh } from "@nearcommerce/api";
type AxiosRequestConfig = { url?: string; headers?: unknown };

type Reply = { status: number; data?: unknown };
type Handler = (config: AxiosRequestConfig) => Reply | Promise<Reply>;

let calls: { url?: string; auth?: string }[] = [];
let respond: Handler;

const adapter = async (config: AxiosRequestConfig) => {
  const headers = config.headers as unknown as {
    get?: (n: string) => string;
    Authorization?: string;
  };
  const auth = headers?.get?.("Authorization") ?? headers?.Authorization;
  calls.push({ url: config.url, auth });
  const { status, data } = await respond(config);
  const response = {
    data,
    status,
    statusText: "",
    headers: {},
    config,
    request: {},
  };
  if (status >= 200 && status < 300) return response;
  const err = Object.assign(new Error(`HTTP ${status}`), {
    isAxiosError: true,
    config,
    response,
  });
  throw err;
};

const handlers = {
  getRefreshToken: jest.fn<string | null, []>(),
  onTokens: jest.fn(),
  onAuthFailure: jest.fn(),
};

beforeEach(() => {
  calls = [];
  jest.clearAllMocks();
  handlers.getRefreshToken.mockReturnValue("refresh-1");
  apiClient.defaults.adapter = adapter as never;
  delete apiClient.defaults.headers.common.Authorization;
  configureTokenRefresh(handlers);
});
afterAll(() => configureTokenRefresh(null));

const refreshOk: Reply = {
  status: 200,
  data: { access_token: "new-access", refresh_token: "refresh-2" },
};

it("refreshes once on 401 and retries the request with the new token", async () => {
  respond = (c) => {
    if (c.url === "/auth/refresh") return refreshOk;
    const auth = calls[calls.length - 1].auth ?? "";
    return auth === "Bearer new-access"
      ? { status: 200, data: { ok: true } }
      : { status: 401 };
  };
  const res = await apiClient.get("/stores/mine", {
    headers: { Authorization: "Bearer old" },
  });
  expect(res.data).toEqual({ ok: true });
  expect(calls.map((c) => c.url)).toEqual([
    "/stores/mine",
    "/auth/refresh",
    "/stores/mine",
  ]);
  expect(handlers.onTokens).toHaveBeenCalledWith({
    accessToken: "new-access",
    refreshToken: "refresh-2",
  });
  expect(handlers.onAuthFailure).not.toHaveBeenCalled();
});

it("shares one refresh between simultaneous 401s", async () => {
  respond = (c) => {
    if (c.url === "/auth/refresh") return refreshOk;
    const auth = calls[calls.length - 1].auth;
    return auth === "Bearer new-access"
      ? { status: 200, data: c.url }
      : { status: 401 };
  };
  const [a, b, c] = await Promise.all([
    apiClient.get("/a", { headers: { Authorization: "Bearer old" } }),
    apiClient.get("/b", { headers: { Authorization: "Bearer old" } }),
    apiClient.get("/c", { headers: { Authorization: "Bearer old" } }),
  ]);
  expect([a.data, b.data, c.data]).toEqual(["/a", "/b", "/c"]);
  expect(calls.filter((x) => x.url === "/auth/refresh")).toHaveLength(1);
});

it("ends the session when the refresh token is rejected", async () => {
  respond = (c) =>
    c.url === "/auth/refresh" ? { status: 401 } : { status: 401 };
  await expect(apiClient.get("/stores/mine")).rejects.toMatchObject({
    response: { status: 401 },
  });
  expect(handlers.onAuthFailure).toHaveBeenCalledTimes(1);
  expect(handlers.onTokens).not.toHaveBeenCalled();
});

it("ends the session when there is no refresh token", async () => {
  handlers.getRefreshToken.mockReturnValue(null);
  respond = () => ({ status: 401 });
  await expect(apiClient.get("/stores/mine")).rejects.toBeDefined();
  expect(handlers.onAuthFailure).toHaveBeenCalledTimes(1);
  expect(calls.map((c) => c.url)).toEqual(["/stores/mine"]);
});

it("keeps the session when the refresh call fails for network reasons", async () => {
  respond = (c) => {
    if (c.url === "/auth/refresh") throw new Error("Network Error");
    return { status: 401 };
  };
  await expect(apiClient.get("/stores/mine")).rejects.toBeDefined();
  expect(handlers.onAuthFailure).not.toHaveBeenCalled();
});

it("does not retry more than once", async () => {
  respond = (c) => (c.url === "/auth/refresh" ? refreshOk : { status: 401 });
  await expect(apiClient.get("/stores/mine")).rejects.toMatchObject({
    response: { status: 401 },
  });
  expect(calls.map((c) => c.url)).toEqual([
    "/stores/mine",
    "/auth/refresh",
    "/stores/mine",
  ]);
});

it.each(["/auth/login", "/auth/reset-password"])(
  "never refreshes for a 401 from %s",
  async (url) => {
    respond = () => ({ status: 401 });
    await expect(apiClient.post(url, {})).rejects.toBeDefined();
    expect(calls).toHaveLength(1);
    expect(handlers.getRefreshToken).not.toHaveBeenCalled();
  },
);

it("passes through non-401 errors untouched", async () => {
  respond = () => ({ status: 500 });
  await expect(apiClient.get("/x")).rejects.toMatchObject({
    response: { status: 500 },
  });
  expect(handlers.getRefreshToken).not.toHaveBeenCalled();
});

it("does nothing when refresh is not configured", async () => {
  configureTokenRefresh(null);
  respond = () => ({ status: 401 });
  await expect(apiClient.get("/x")).rejects.toBeDefined();
  expect(calls).toHaveLength(1);
});
