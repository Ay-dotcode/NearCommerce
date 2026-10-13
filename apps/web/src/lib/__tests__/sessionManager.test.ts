import {
  apiClient,
  createSessionManager,
  type SessionStorage,
} from "@nearcommerce/api";

const memory = (): SessionStorage & { data: Map<string, string> } => {
  const data = new Map<string, string>();
  return {
    data,
    get: (k) => data.get(k) ?? null,
    set: (k, v) => void data.set(k, v),
    remove: (k) => void data.delete(k),
  };
};

const post = jest.spyOn(apiClient, "post");
const headers = apiClient.defaults.headers.common as Record<string, string>;

beforeEach(() => {
  jest.clearAllMocks();
  post.mockResolvedValue({} as never);
  delete headers.Authorization;
});

describe("createSessionManager", () => {
  it("saves tokens and starts using them, in whichever storage the portal gives it", () => {
    const storage = memory();
    const session = createSessionManager(storage);
    session.saveTokens("a1", "r1");
    session.saveRole("STORE_OWNER");
    expect(session.getAccessToken()).toBe("a1");
    expect(session.getRefreshToken()).toBe("r1");
    expect(session.getRole()).toBe("STORE_OWNER");
    expect(headers.Authorization).toBe("Bearer a1");
  });

  it("keeps the old refresh token when only an access token is saved", () => {
    const session = createSessionManager(memory());
    session.saveTokens("a1", "r1");
    session.saveTokens("a2");
    expect(session.getRefreshToken()).toBe("r1");
    expect(session.getAccessToken()).toBe("a2");
  });

  it("restores the Authorization header after a page reload", () => {
    const storage = memory();
    storage.set("access_token", "saved");
    createSessionManager(storage).restoreAuthHeader();
    expect(headers.Authorization).toBe("Bearer saved");
  });

  it("clear removes everything, the header too, and runs the portal's own clean-up", () => {
    const onClear = jest.fn();
    const storage = memory();
    const session = createSessionManager(storage, { onClear });
    session.saveTokens("a", "r");
    session.saveRole("X");
    session.clear();
    expect([...storage.data.keys()]).toEqual([]);
    expect(headers.Authorization).toBeUndefined();
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it("signs out locally at once, then tells the server in the background", async () => {
    const session = createSessionManager(memory());
    session.saveTokens("a", "r");
    const done = session.signOutEverywhere();
    expect(session.getAccessToken()).toBeNull();
    await done;
    expect(post).toHaveBeenCalledWith("/auth/logout", { refresh_token: "r" });
  });

  it("signs out quietly even when the server cannot be reached or there is no refresh token", async () => {
    post.mockRejectedValue(new Error("offline"));
    const a = createSessionManager(memory());
    a.saveTokens("a", "r");
    await expect(a.signOutEverywhere()).resolves.toBeUndefined();
    post.mockClear();
    await createSessionManager(memory()).signOutEverywhere();
    expect(post).not.toHaveBeenCalled();
  });
});
