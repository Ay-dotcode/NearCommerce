import { Platform } from "react-native";

// Maximum characters allowed in a review comment (mirrors REVIEW_COMMENT_MAX on the API).
export const COMMENT_MAX = 1000;

// Number of reviews fetched per page in the ReviewsSection paginated list.
export const REVIEWS_PAGE_SIZE = 10;

// Accepts US ZIP codes and most international postal codes.
export const POSTAL_CODE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9 -]{2,9}$/;

// AsyncStorage key for the "avoid tolls" routing preference (SRS 5.4.2).
export const AVOID_TOLLS_KEY = "@routing_avoid_tolls";

// Metres in a mile, for showing distances.
export const METERS_PER_MILE = 1609.34;

// Backend base URL. Expo only inlines a direct `process.env.EXPO_PUBLIC_*` read, so keep it
// exactly in this form.
const defaultApiUrl =
  Platform.OS === "android" ? "http://10.0.2.2:4000" : "http://localhost:4000";

export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? defaultApiUrl;
