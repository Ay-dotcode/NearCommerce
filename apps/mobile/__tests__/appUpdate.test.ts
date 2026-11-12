import { UPDATE_SKIPPED_KEY } from "@/constants";
import {
  checkForUpdate,
  classifyUpdate,
  compareVersions,
  fetchLatestRelease,
  openUpdatePage,
  parseVersion,
  resolveUpdateUrl,
  skipUpdate,
} from "@/helpers/appUpdate";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Linking, Platform } from "react-native";

let mockInstalled: string | null = "1.0.2";
jest.mock("expo-constants", () => ({
  __esModule: true,
  default: {
    get nativeAppVersion() {
      return mockInstalled;
    },
    expoConfig: { version: "0.0.0-config" },
  },
}));

// The address configured in EXPO_PUBLIC_APP_DOWNLOAD_URL (unset by default).
let mockConfiguredUrl: string | undefined;
jest.mock("@/constants", () => {
  const mocked = { ...jest.requireActual("@/constants") };
  // Read when used (not copied now), so each test can set it.
  Object.defineProperty(mocked, "APP_DOWNLOAD_URL", {
    enumerable: true,
    get: () => mockConfiguredUrl,
  });
  return mocked;
});

const RELEASES = "https://github.com/Ay-dotcode/NearCommerce/releases";
const apkOf = (tag: string) =>
  `${RELEASES}/download/${tag}/NearCommerce-${tag}.apk`;

// Pretends GitHub's "latest release" reply.
function mockRelease(
  tag: string,
  url = `${RELEASES}/tag/${tag}`,
  assets: unknown[] = [],
) {
  global.fetch = jest.fn(() =>
    Promise.resolve({
      ok: true,
      json: () =>
        Promise.resolve({ tag_name: tag, html_url: url, assets }),
    }),
  ) as unknown as typeof fetch;
}

// A file attached to a release.
const asset = (name: string, url: string) => ({
  name,
  browser_download_url: url,
});

beforeEach(async () => {
  mockInstalled = "1.0.2";
  mockConfiguredUrl = undefined;
  jest.replaceProperty(Platform, "OS", "android");
  await AsyncStorage.clear();
});
afterEach(() => jest.restoreAllMocks());

describe("parseVersion", () => {
  it.each([
    ["1.2.3", [1, 2, 3]],
    ["v1.2.3", [1, 2, 3]],
    ["1.2", [1, 2, 0]],
    ["v2", [2, 0, 0]],
    [" 10.20.30 ", [10, 20, 30]],
    ["1.2.3-beta.1", [1, 2, 3]],
    ["1.2.3+build5", [1, 2, 3]],
  ])("reads %s", (text, expected) => {
    expect(parseVersion(text)).toEqual(expected);
  });

  it.each(["", "latest", "v", "1.x", "a.b.c", "1.2.3.4"])(
    "rejects %p",
    (text) => {
      expect(parseVersion(text)).toBeNull();
    },
  );
});

describe("compareVersions", () => {
  it("orders by major, then minor, then patch", () => {
    expect(compareVersions([2, 0, 0], [1, 9, 9])).toBeGreaterThan(0);
    expect(compareVersions([1, 3, 0], [1, 2, 9])).toBeGreaterThan(0);
    expect(compareVersions([1, 2, 4], [1, 2, 3])).toBeGreaterThan(0);
    expect(compareVersions([1, 2, 3], [1, 2, 3])).toBe(0);
    expect(compareVersions([1, 2, 3], [1, 10, 0])).toBeLessThan(0);
  });
});

describe("classifyUpdate", () => {
  it("asks for nothing when the app is current or newer", () => {
    expect(classifyUpdate("1.0.2", "1.0.2")).toBe("none");
    expect(classifyUpdate("1.0.2", "v1.0.2")).toBe("none");
    expect(classifyUpdate("1.1.0", "1.0.9")).toBe("none");
    expect(classifyUpdate("2.0.0", "1.9.9")).toBe("none");
  });

  it("makes a new patch version optional", () => {
    expect(classifyUpdate("1.0.2", "1.0.3")).toBe("optional");
  });

  it("makes a new minor version optional", () => {
    expect(classifyUpdate("1.0.2", "1.1.0")).toBe("optional");
    expect(classifyUpdate("1.4.0", "1.10.0")).toBe("optional");
  });

  it("requires a new major version", () => {
    expect(classifyUpdate("1.0.2", "2.0.0")).toBe("required");
    expect(classifyUpdate("1.9.9", "v2.0.0")).toBe("required");
    expect(classifyUpdate("1.0.2", "3.1.4")).toBe("required");
  });

  it("never asks for anything when a version can't be read", () => {
    expect(classifyUpdate("1.0.2", "latest")).toBe("none");
    expect(classifyUpdate("", "2.0.0")).toBe("none");
  });
});

describe("fetchLatestRelease", () => {
  it("returns the version (without the v), the release page and the APK", async () => {
    mockRelease("v1.3.0", undefined, [
      asset("NearCommerce-v1.3.0.apk", apkOf("v1.3.0")),
    ]);
    expect(await fetchLatestRelease()).toEqual({
      version: "1.3.0",
      url: `${RELEASES}/tag/v1.3.0`,
      apkUrl: apkOf("v1.3.0"),
    });
  });

  it("has no APK address when the release has no APK attached", async () => {
    mockRelease("v1.3.0");
    expect((await fetchLatestRelease())?.apkUrl).toBeNull();
    mockRelease("v1.3.0", undefined, [
      asset("Source code (zip)", `${RELEASES}/download/v1.3.0/source.zip`),
    ]);
    expect((await fetchLatestRelease())?.apkUrl).toBeNull();
  });

  it("picks the APK out of several attached files", async () => {
    mockRelease("v1.3.0", undefined, [
      asset("notes.txt", `${RELEASES}/download/v1.3.0/notes.txt`),
      asset("NearCommerce-v1.3.0.apk", apkOf("v1.3.0")),
    ]);
    expect((await fetchLatestRelease())?.apkUrl).toBe(apkOf("v1.3.0"));
  });

  it("doesn't trust an APK address from anywhere but the project's releases", async () => {
    mockRelease("v1.3.0", undefined, [
      asset("NearCommerce-v1.3.0.apk", "https://evil.example/NearCommerce.apk"),
    ]);
    expect((await fetchLatestRelease())?.apkUrl).toBeNull();
  });

  it("asks GitHub's latest-release address", async () => {
    mockRelease("v1.3.0");
    await fetchLatestRelease();
    expect((global.fetch as jest.Mock).mock.calls[0][0]).toBe(
      "https://api.github.com/repos/Ay-dotcode/NearCommerce/releases/latest",
    );
  });

  it("gives null when GitHub says no", async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({ ok: false, json: () => Promise.resolve({}) }),
    ) as unknown as typeof fetch;
    expect(await fetchLatestRelease()).toBeNull();
  });

  it("gives null when the phone is offline", async () => {
    global.fetch = jest.fn(() =>
      Promise.reject(new TypeError("Network request failed")),
    ) as unknown as typeof fetch;
    expect(await fetchLatestRelease()).toBeNull();
  });

  it("gives up when the answer is too slow", async () => {
    global.fetch = jest.fn(
      (_url: string, init: { signal: AbortSignal }) =>
        new Promise((_resolve, reject) =>
          init.signal.addEventListener("abort", () =>
            reject(new Error("aborted")),
          ),
        ),
    ) as unknown as typeof fetch;
    expect(await fetchLatestRelease(20)).toBeNull();
  });

  it.each([
    ["a reply without a tag", {}],
    ["a tag that isn't a version", { tag_name: "nightly", html_url: `${RELEASES}/x` }],
    ["a page somewhere else", { tag_name: "v2.0.0", html_url: "https://evil.example/app" }],
    ["a page that only looks similar", { tag_name: "v2.0.0", html_url: "https://github.com/Ay-dotcode/NearCommerce-fake/releases/tag/v2.0.0" }],
  ])("gives null for %s", async (_name, body) => {
    global.fetch = jest.fn(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve(body) }),
    ) as unknown as typeof fetch;
    expect(await fetchLatestRelease()).toBeNull();
  });
});

describe("resolveUpdateUrl", () => {
  const release = {
    version: "1.2.0",
    url: `${RELEASES}/tag/v1.2.0`,
    apkUrl: apkOf("v1.2.0"),
  };

  it("uses the release's own APK by default", () => {
    expect(resolveUpdateUrl(release, undefined)).toBe(apkOf("v1.2.0"));
  });

  it("falls back to the release page when it has no APK", () => {
    expect(resolveUpdateUrl({ ...release, apkUrl: null }, undefined)).toBe(
      `${RELEASES}/tag/v1.2.0`,
    );
  });

  it("uses the configured address instead when there is one", () => {
    expect(
      resolveUpdateUrl(release, "https://example.com/downloads/app.apk"),
    ).toBe("https://example.com/downloads/app.apk");
  });

  it("fills in {version} and {tag} in the configured address", () => {
    expect(
      resolveUpdateUrl(
        release,
        "https://example.com/{tag}/app-{version}.apk?v={version}",
      ),
    ).toBe("https://example.com/v1.2.0/app-1.2.0.apk?v=1.2.0");
  });

  it("accepts a store page", () => {
    expect(
      resolveUpdateUrl(
        release,
        "https://play.google.com/store/apps/details?id=com.nearcommerce.app",
      ),
    ).toBe("https://play.google.com/store/apps/details?id=com.nearcommerce.app");
  });

  it.each(["", "   "])("ignores an empty setting (%p)", (configured) => {
    expect(resolveUpdateUrl(release, configured)).toBe(apkOf("v1.2.0"));
  });
});

describe("checkForUpdate", () => {
  it("points Update at the release's APK", async () => {
    mockRelease("v2.0.0", undefined, [
      asset("NearCommerce-v2.0.0.apk", apkOf("v2.0.0")),
    ]);
    expect(await checkForUpdate()).toMatchObject({
      status: "required",
      url: apkOf("v2.0.0"),
    });
  });

  it("points Update at the configured address when there is one", async () => {
    mockConfiguredUrl = "https://play.google.com/store/apps/details?id=x";
    mockRelease("v2.0.0", undefined, [
      asset("NearCommerce-v2.0.0.apk", apkOf("v2.0.0")),
    ]);
    expect(await checkForUpdate()).toMatchObject({
      url: "https://play.google.com/store/apps/details?id=x",
    });
  });

  it("requires a new major version", async () => {
    mockRelease("v2.0.0");
    expect(await checkForUpdate()).toEqual({
      status: "required",
      current: "1.0.2",
      latest: "2.0.0",
      url: `${RELEASES}/tag/v2.0.0`,
    });
  });

  it("offers a new minor version", async () => {
    mockRelease("v1.1.0");
    expect(await checkForUpdate()).toMatchObject({
      status: "optional",
      current: "1.0.2",
      latest: "1.1.0",
    });
  });

  it("offers a new patch version", async () => {
    mockRelease("v1.0.3");
    expect((await checkForUpdate()).status).toBe("optional");
  });

  it("does nothing when the app is up to date", async () => {
    mockRelease("v1.0.2");
    expect(await checkForUpdate()).toEqual({ status: "none" });
  });

  it("does nothing when the check can't be made", async () => {
    global.fetch = jest.fn(() =>
      Promise.reject(new Error("offline")),
    ) as unknown as typeof fetch;
    expect(await checkForUpdate()).toEqual({ status: "none" });
  });

  it("doesn't ask again about an optional update that was skipped", async () => {
    mockRelease("v1.1.0");
    await AsyncStorage.setItem(UPDATE_SKIPPED_KEY, "1.1.0");
    expect(await checkForUpdate()).toEqual({ status: "none" });
  });

  it("asks again when an even newer version comes out", async () => {
    mockRelease("v1.2.0");
    await AsyncStorage.setItem(UPDATE_SKIPPED_KEY, "1.1.0");
    expect((await checkForUpdate()).status).toBe("optional");
  });

  it("never lets a skipped version get past a required update", async () => {
    mockRelease("v2.0.0");
    await AsyncStorage.setItem(UPDATE_SKIPPED_KEY, "2.0.0");
    expect((await checkForUpdate()).status).toBe("required");
  });

  it("falls back to the configured version when the phone doesn't say", async () => {
    mockInstalled = null;
    mockRelease("v1.0.0");
    // The configured version here is 0.0.0-config, so 1.0.0 is a major update.
    expect((await checkForUpdate()).status).toBe("required");
  });

  it("only checks on Android, the only platform builds are published for", async () => {
    jest.replaceProperty(Platform, "OS", "ios");
    mockRelease("v2.0.0");
    expect(await checkForUpdate()).toEqual({ status: "none" });
    expect(global.fetch).not.toHaveBeenCalled();
  });
});

describe("skipUpdate", () => {
  it("remembers the skipped version", async () => {
    await skipUpdate("1.1.0");
    expect(await AsyncStorage.getItem(UPDATE_SKIPPED_KEY)).toBe("1.1.0");
  });
});

describe("openUpdatePage", () => {
  it("opens the release page", async () => {
    const open = jest.spyOn(Linking, "openURL").mockResolvedValue(true);
    expect(await openUpdatePage(`${RELEASES}/tag/v2.0.0`)).toBe(true);
    expect(open).toHaveBeenCalledWith(`${RELEASES}/tag/v2.0.0`);
  });

  it("says so when the phone can't open it", async () => {
    jest.spyOn(Linking, "openURL").mockRejectedValue(new Error("no browser"));
    expect(await openUpdatePage(`${RELEASES}/tag/v2.0.0`)).toBe(false);
  });
});
