/// <reference types="vite/client" />

interface ImportMetaEnv {
  // Web OAuth client id for "Continue with Google". Empty or missing hides the button.
  readonly VITE_GOOGLE_CLIENT_ID?: string;
}
