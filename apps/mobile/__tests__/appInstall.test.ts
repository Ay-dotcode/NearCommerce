import {
  apkFileName,
  canInstallInApp,
  downloadApk,
  installApk,
  isApkUrl,
} from "@/helpers/appInstall";
import { Platform } from "react-native";

// A stand-in for the downloaded file on the phone.
const mockFile = { exists: false, size: 0, uri: "" };
const mockDelete = jest.fn(() => {
  mockFile.exists = false;
});
const mockDownload = jest.fn();
let mockModulesMissing = false;

jest.mock("expo-file-system", () => {
  if (mockModulesMissing) throw new Error("Cannot find native module");
  class File {
    constructor(_dir: unknown, name: string) {
      mockFile.uri = `file:///cache/${name}`;
    }
    get exists() {
      return mockFile.exists;
    }
    get size() {
      return mockFile.size;
    }
    get uri() {
      return mockFile.uri;
    }
    delete = mockDelete;
    static downloadFileAsync = (...args: unknown[]) => mockDownload(...args);
  }
  return { File, Paths: { cache: "cache-dir" } };
});
const mockContentUri = jest.fn((uri: string) =>
  Promise.resolve(uri.replace("file://", "content://app.fileprovider")),
);
jest.mock("expo-file-system/legacy", () => ({
  getContentUriAsync: (uri: string) => mockContentUri(uri),
}));
const mockStartActivity = jest.fn(() => Promise.resolve({ resultCode: 0 }));
jest.mock("expo-intent-launcher", () => ({
  startActivityAsync: (...args: unknown[]) =>
    (mockStartActivity as jest.Mock)(...args),
}));

const APK =
  "https://github.com/Ay-dotcode/NearCommerce/releases/download/v1.2.0/NearCommerce-v1.2.0.apk";

beforeEach(() => {
  jest.clearAllMocks();
  mockModulesMissing = false;
  mockFile.exists = false;
  mockFile.size = 0;
  jest.replaceProperty(Platform, "OS", "android");
});
afterEach(() => jest.restoreAllMocks());

describe("isApkUrl", () => {
  it.each([
    APK,
    "https://example.com/app.apk",
    "https://example.com/app.APK",
    "https://example.com/app.apk?token=abc",
    "https://example.com/app.apk#download",
  ])("accepts %s", (url) => expect(isApkUrl(url)).toBe(true));

  it.each([
    "https://play.google.com/store/apps/details?id=com.nearcommerce.app",
    "market://details?id=com.nearcommerce.app",
    "http://example.com/app.apk",
    "https://github.com/Ay-dotcode/NearCommerce/releases/tag/v1.2.0",
    "https://example.com/app.apk.html",
    "https://example.com/?file=app.apk",
    "",
  ])("rejects %p", (url) => expect(isApkUrl(url)).toBe(false));
});

describe("canInstallInApp", () => {
  it("is true on Android when the native modules are there", () => {
    expect(canInstallInApp()).toBe(true);
  });

  it("is false on other platforms", () => {
    jest.replaceProperty(Platform, "OS", "ios");
    expect(canInstallInApp()).toBe(false);
  });

  it("is false in a build made without the native modules (an older install)", () => {
    mockModulesMissing = true;
    jest.resetModules();
    jest.isolateModules(() => {
      const fresh = require("@/helpers/appInstall");
      expect(fresh.canInstallInApp()).toBe(false);
    });
  });
});

describe("apkFileName", () => {
  it("names the file after the version", () => {
    expect(apkFileName("1.2.0")).toBe("NearCommerce-1.2.0.apk");
  });

  it("keeps odd characters out of the file name", () => {
    expect(apkFileName("1.2.0/../x y")).toBe("NearCommerce-1.2.0_.._x_y.apk");
  });
});

describe("downloadApk", () => {
  // Pretends the download wrote `size` bytes.
  const downloads = (size: number) =>
    mockDownload.mockImplementation(async () => {
      mockFile.exists = true;
      mockFile.size = size;
    });

  it("downloads into the cache and gives back the file's address", async () => {
    downloads(5_000_000);
    const { promise } = downloadApk(APK, "1.2.0", jest.fn());
    expect(await promise).toBe("file:///cache/NearCommerce-1.2.0.apk");
    const [url, , options] = mockDownload.mock.calls[0];
    expect(url).toBe(APK);
    expect(options.idempotent).toBe(true);
  });

  it("reports progress as a fraction, and null while the size is unknown", async () => {
    mockDownload.mockImplementation(async (_u, _f, options) => {
      options.onProgress({ bytesWritten: 250, totalBytes: 1000 });
      options.onProgress({ bytesWritten: 900, totalBytes: 600 });
      options.onProgress({ bytesWritten: 300, totalBytes: -1 });
      mockFile.exists = true;
      mockFile.size = 1000;
    });
    const seen: (number | null)[] = [];
    await downloadApk(APK, "1.2.0", (f) => seen.push(f)).promise;
    expect(seen).toEqual([0.25, 1, null]);
  });

  it("starts from nothing when a file from an earlier try is there", async () => {
    mockFile.exists = true;
    mockFile.size = 10;
    downloads(5_000_000);
    await downloadApk(APK, "1.2.0", jest.fn()).promise;
    expect(mockDelete).toHaveBeenCalledTimes(1);
  });

  it("fails, and keeps nothing, when the download fails", async () => {
    mockDownload.mockImplementation(async () => {
      mockFile.exists = true;
      mockFile.size = 100;
      throw new Error("UnableToDownload: 404");
    });
    await expect(downloadApk(APK, "1.2.0", jest.fn()).promise).rejects.toThrow(
      "404",
    );
    expect(mockFile.exists).toBe(false);
  });

  it("fails, and keeps nothing, when the file comes out empty", async () => {
    downloads(0);
    await expect(downloadApk(APK, "1.2.0", jest.fn()).promise).rejects.toThrow(
      /empty/i,
    );
    expect(mockFile.exists).toBe(false);
  });

  it("can be cancelled", async () => {
    let signal: AbortSignal | undefined;
    mockDownload.mockImplementation(
      (_u, _f, options) =>
        new Promise((_resolve, reject) => {
          signal = options.signal;
          signal?.addEventListener("abort", () => reject(new Error("aborted")));
        }),
    );
    const download = downloadApk(APK, "1.2.0", jest.fn());
    await Promise.resolve();
    download.cancel();
    await expect(download.promise).rejects.toThrow("aborted");
    expect(signal?.aborted).toBe(true);
    expect(mockFile.exists).toBe(false);
  });
});

describe("installApk", () => {
  it("hands the file to Android's installer through a content address", async () => {
    await installApk("file:///cache/NearCommerce-1.2.0.apk");
    expect(mockContentUri).toHaveBeenCalledWith(
      "file:///cache/NearCommerce-1.2.0.apk",
    );
    expect(mockStartActivity).toHaveBeenCalledWith(
      "android.intent.action.VIEW",
      {
        data: "content://app.fileprovider/cache/NearCommerce-1.2.0.apk",
        flags: 1,
        type: "application/vnd.android.package-archive",
      },
    );
  });

  it("fails when the installer can't be opened", async () => {
    mockStartActivity.mockRejectedValueOnce(new Error("no activity"));
    await expect(installApk("file:///cache/x.apk")).rejects.toThrow(
      "no activity",
    );
  });
});
