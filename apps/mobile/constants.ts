import { Platform } from "react-native";

// Maximum characters allowed in a review comment (mirrors REVIEW_COMMENT_MAX on the API).
export const COMMENT_MAX = 1000;

// Number of reviews fetched per page in the ReviewsSection paginated list.
export const REVIEWS_PAGE_SIZE = 10;

// Accepts US ZIP codes and most international postal codes.
export const POSTAL_CODE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9 -]{2,9}$/;

// Metres in a kilometre, for sending and showing distances.
export const METERS_PER_KM = 1000;

// AsyncStorage keys and limits for "how far shops can be from me" (Settings), in kilometres.
// The default matches the server's 5 km default; the maximum is the server's 50 km cap.
export const SEARCH_RADIUS_KEY = "@search_radius_km";
export const SEARCH_RADIUS_MIN_KM = 1;
export const SEARCH_RADIUS_MAX_KM = 50;
export const SEARCH_RADIUS_DEFAULT_KM = 5;

// AsyncStorage key for "only show shops near me". When off, every shop is searched and the
// results are sorted by distance instead.
export const NEARBY_ONLY_KEY = "@search_nearby_only";

// Backend base URL. Expo only inlines a direct `process.env.EXPO_PUBLIC_*` read, so keep it
// exactly in this form.
const defaultApiUrl =
  Platform.OS === "android" ? "http://10.0.2.2:4000" : "http://localhost:4000";

export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? defaultApiUrl;

// AsyncStorage key that remembers the first-launch introduction was seen ("1").
export const ONBOARDING_SEEN_KEY = "@onboarding_seen";

// In-app update check. New builds are published as GitHub Releases (see release-android.yml), so
// the newest release is the newest app. Its tag is the app version, for example "v1.2.0".
export const UPDATE_RELEASE_API_URL =
  "https://api.github.com/repos/Ay-dotcode/NearCommerce/releases/latest";

// Release pages and release files are the only GitHub addresses the update check trusts.
export const UPDATE_RELEASE_PAGE_PREFIX =
  "https://github.com/Ay-dotcode/NearCommerce/releases/";

// Where the update screen's button goes. Leave it unset to use the APK attached to the newest
// GitHub Release (what release-android.yml publishes). Set it to use another address:
//   - a direct link to an .apk file: downloaded and installed inside the app. "{version}" and
//     "{tag}" are replaced with the new version ("1.2.0") and its tag ("v1.2.0").
//   - any other link, such as the app's Google Play page: simply opened.
// Expo only inlines a direct `process.env.EXPO_PUBLIC_*` read, so keep it exactly in this form.
export const APP_DOWNLOAD_URL = process.env.EXPO_PUBLIC_APP_DOWNLOAD_URL;

// How long opening the app may wait for the update check before carrying on without it.
export const UPDATE_CHECK_TIMEOUT_MS = 3000;

// AsyncStorage key holding the version whose optional update the shopper chose to skip.
export const UPDATE_SKIPPED_KEY = "@update_skipped_version";
