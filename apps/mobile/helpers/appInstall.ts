import { Platform } from "react-native";

type FileSystemModule = typeof import("expo-file-system");
type LegacyFileSystemModule = typeof import("expo-file-system/legacy");
type IntentLauncherModule = typeof import("expo-intent-launcher");

function loadNativeModules() {
  try {
    return {
      files: require("expo-file-system") as FileSystemModule,
      legacy: require("expo-file-system/legacy") as LegacyFileSystemModule,
      launcher: require("expo-intent-launcher") as IntentLauncherModule,
    };
  } catch {
    return null;
  }
}

const APK_MIME_TYPE = "application/vnd.android.package-archive";
// Lets the installer read the file through the content address it is handed.
const FLAG_GRANT_READ_URI_PERMISSION = 1;

// A direct https link to an .apk file (a query string or "#" part after it is fine).
export function isApkUrl(url: string): boolean {
  return /^https:\/\/[^?#\s]+\.apk(?:[?#]|$)/i.test(url.trim());
}

// Can this app download and install an update itself?
export function canInstallInApp(): boolean {
  return Platform.OS === "android" && loadNativeModules() !== null;
}

export function apkFileName(version: string): string {
  return `NearCommerce-${version.replace(/[^\w.-]/g, "_")}.apk`;
}

export interface ApkDownload {
  // Resolves to the downloaded file's address.
  promise: Promise<string>;
  // Stops the download; `promise` then rejects.
  cancel: () => void;
}

// Downloads the APK into the app's cache. `onProgress` gets 0 to 1, or null while the size isn't
// known (the server didn't say).
export function downloadApk(
  url: string,
  version: string,
  onProgress: (fraction: number | null) => void,
): ApkDownload {
  const controller = new AbortController();
  const promise = (async () => {
    const native = loadNativeModules();
    if (!native) throw new Error("Installing inside the app isn't available");
    const { File, Paths } = native.files;
    const file = new File(Paths.cache, apkFileName(version));
    try {
      // Start from nothing: a file left by an earlier try may be incomplete.
      if (file.exists) file.delete();
      await File.downloadFileAsync(url, file, {
        idempotent: true,
        signal: controller.signal,
        onProgress: ({ bytesWritten, totalBytes }) =>
          onProgress(
            totalBytes > 0 ? Math.min(1, bytesWritten / totalBytes) : null,
          ),
      });
      if (!file.exists || file.size <= 0)
        throw new Error("The downloaded file is empty");
      return file.uri;
    } catch (error) {
      // Never keep half a download.
      try {
        if (file.exists) file.delete();
      } catch {}
      throw error;
    }
  })();
  return { promise, cancel: () => controller.abort() };
}

// Hands the downloaded APK to Android's installer, which asks the shopper to confirm. Resolves
// when the installer is closed again: if the install went ahead the app has been replaced by
// then, so a resolved promise means it was cancelled (or, the first time, that Android sent the
// shopper to allow installs from this app).
export async function installApk(fileUri: string): Promise<void> {
  const native = loadNativeModules();
  if (!native) throw new Error("Installing inside the app isn't available");
  const contentUri = await native.legacy.getContentUriAsync(fileUri);
  await native.launcher.startActivityAsync("android.intent.action.VIEW", {
    data: contentUri,
    flags: FLAG_GRANT_READ_URI_PERMISSION,
    type: APK_MIME_TYPE,
  });
}
