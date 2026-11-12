import {
  APP_DOWNLOAD_URL,
  UPDATE_CHECK_TIMEOUT_MS,
  UPDATE_RELEASE_API_URL,
  UPDATE_RELEASE_PAGE_PREFIX,
  UPDATE_SKIPPED_KEY,
} from "@/constants";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { Linking, Platform } from "react-native";

type Version = [major: number, minor: number, patch: number];

// "1.2.3", "v1.2.3", "1.2" and "v2" (a missing part counts as 0). Anything after a "-" or "+"
// (such as "-beta.1") is ignored. Returns null for text that is not a version.
export function parseVersion(text: string): Version | null {
  const match = /^v?(\d+)(?:\.(\d+))?(?:\.(\d+))?(?:[-+].*)?$/.exec(text.trim());
  if (!match) return null;
  return [Number(match[1]), Number(match[2] ?? 0), Number(match[3] ?? 0)];
}

// Negative when `a` is older than `b`, positive when newer, 0 when the same.
export function compareVersions(a: Version, b: Version): number {
  for (let i = 0; i < 3; i++) if (a[i] !== b[i]) return a[i] - b[i];
  return 0;
}

export type UpdateKind = "none" | "optional" | "required";

// A new major version must be installed; a new minor or patch version can be skipped. A version
// that isn't newer, or can't be read, never asks for anything (never trap anyone by mistake).
export function classifyUpdate(installed: string, latest: string): UpdateKind {
  const have = parseVersion(installed);
  const want = parseVersion(latest);
  if (!have || !want || compareVersions(want, have) <= 0) return "none";
  return want[0] > have[0] ? "required" : "optional";
}

// The version of the app that is installed on this phone (the native build, which is what an
// update replaces). Null when the phone doesn't say.
export function installedVersion(): string | null {
  return Constants.nativeAppVersion ?? Constants.expoConfig?.version ?? null;
}

export interface LatestRelease {
  // For example "1.2.0" (the release tag without a leading "v").
  version: string;
  // The release's web page.
  url: string;
  // The APK attached to the release, when there is one.
  apkUrl: string | null;
}

// Asks GitHub for the newest published release. Null on any failure (offline, slow, rate
// limited, unexpected reply): the update check never gets in the way of using the app.
export async function fetchLatestRelease(
  timeoutMs = UPDATE_CHECK_TIMEOUT_MS,
): Promise<LatestRelease | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(UPDATE_RELEASE_API_URL, {
      headers: { Accept: "application/vnd.github+json" },
      signal: controller.signal,
    });
    if (!response.ok) return null;
    const release = (await response.json()) as {
      tag_name?: unknown;
      html_url?: unknown;
      assets?: unknown;
    };
    const { tag_name: tag, html_url: url } = release;
    if (typeof tag !== "string" || typeof url !== "string") return null;
    // Only ever send people to the project's own release pages.
    if (!url.startsWith(UPDATE_RELEASE_PAGE_PREFIX)) return null;
    if (!parseVersion(tag)) return null;
    return {
      version: tag.trim().replace(/^v/, ""),
      url,
      apkUrl: findApkUrl(release.assets),
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// The download address of the APK among a release's attached files, if it has one.
function findApkUrl(assets: unknown): string | null {
  if (!Array.isArray(assets)) return null;
  for (const asset of assets) {
    const name = asset?.name;
    const url = asset?.browser_download_url;
    if (
      typeof name === "string" &&
      typeof url === "string" &&
      /\.apk$/i.test(name) &&
      url.startsWith(UPDATE_RELEASE_PAGE_PREFIX)
    )
      return url;
  }
  return null;
}

// Where the update screen's button goes for `release`: the address configured in
// EXPO_PUBLIC_APP_DOWNLOAD_URL if there is one, otherwise the release's own APK (or, for a release
// without one, its web page).
export function resolveUpdateUrl(
  release: LatestRelease,
  configured: string | undefined = APP_DOWNLOAD_URL,
): string {
  const custom = configured?.trim();
  if (custom)
    return custom
      .replace(/\{version\}/g, release.version)
      .replace(/\{tag\}/g, `v${release.version}`);
  return release.apkUrl ?? release.url;
}

export type UpdateCheck =
  | { status: "none" }
  | {
      status: "optional" | "required";
      current: string;
      latest: string;
      url: string;
    };

// Is a newer version of the app out? Only Android builds are published as releases, so other
// platforms are never asked to update.
export async function checkForUpdate(): Promise<UpdateCheck> {
  if (Platform.OS !== "android") return { status: "none" };
  const current = installedVersion();
  if (!current) return { status: "none" };

  const release = await fetchLatestRelease();
  if (!release) return { status: "none" };

  const status = classifyUpdate(current, release.version);
  if (status === "none") return { status: "none" };

  // Someone who chose "Continue" for this version isn't asked again until a newer one is out.
  // A required update can't be skipped, so it ignores that choice.
  if (status === "optional") {
    const skipped = await AsyncStorage.getItem(UPDATE_SKIPPED_KEY).catch(
      () => null,
    );
    if (skipped === release.version) return { status: "none" };
  }
  return {
    status,
    current,
    latest: release.version,
    url: resolveUpdateUrl(release),
  };
}

// Remembers that the shopper chose to carry on without installing `version`.
export async function skipUpdate(version: string): Promise<void> {
  try {
    await AsyncStorage.setItem(UPDATE_SKIPPED_KEY, version);
  } catch {
    // Not remembering only means being asked again next time.
  }
}

// Opens an address in the browser (or the app that handles it, such as Google Play). Resolves to
// false when the phone could not open it.
export async function openUpdatePage(url: string): Promise<boolean> {
  try {
    await Linking.openURL(url);
    return true;
  } catch {
    return false;
  }
}
