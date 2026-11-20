import {
  GoogleSignin,
  isCancelledResponse,
  isErrorWithCode,
  statusCodes,
} from "@react-native-google-signin/google-signin";

// What a failed attempt should show. `null` from the functions below means "say nothing":
// the person simply closed the Google sheet, or a sign-in is already running.
export interface GoogleFailure {
  message: string;
  suspended: boolean;
}

// The Web OAuth client id. Google puts it in the ID token as the audience, and the API checks
// it, so it is the same value as the backend's GOOGLE_CLIENT_IDS. Unset = no Google button.
export const googleWebClientId = () =>
  process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim() || "";

// Opens Google's account picker and returns the ID token, or null if the person closed it.
// Throws (a native error with a `code`) for anything else; use describeNativeFailure for that.
export async function requestGoogleIdToken(): Promise<string | null> {
  GoogleSignin.configure({
    webClientId: googleWebClientId(),
    iosClientId:
      process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?.trim() || undefined,
  });
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  const response = await GoogleSignin.signIn();
  if (isCancelledResponse(response)) return null;
  const token = response.data.idToken;
  if (!token) throw new Error("Google did not return a sign-in token.");
  return token;
}

// A failure of the Google sheet itself (not of our API).
export function describeNativeFailure(error: unknown): GoogleFailure | null {
  if (isErrorWithCode(error)) {
    if (
      error.code === statusCodes.SIGN_IN_CANCELLED ||
      error.code === statusCodes.IN_PROGRESS
    )
      return null;
    if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE)
      return {
        message:
          "Google Play services are missing or out of date, so Google sign-in is unavailable.",
        suspended: false,
      };
  }
  return {
    message: "Google sign-in could not start. Please try again.",
    suspended: false,
  };
}

// Forget the Google account on this device, so the next sign-in shows the account picker
// instead of silently reusing the previous one. Never throws.
export async function signOutOfGoogle(): Promise<void> {
  try {
    await GoogleSignin.signOut();
  } catch {
    // Nothing to do: either not signed in with Google, or the native side is unavailable.
  }
}
