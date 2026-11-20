// The OAuth Web client id for "Continue with Google" (VITE_GOOGLE_CLIENT_ID). When it is empty
// the Google button is not shown at all.
export const googleClientId: string =
  import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim() ?? "";
