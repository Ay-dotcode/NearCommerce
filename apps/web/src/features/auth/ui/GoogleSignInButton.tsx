import { useGoogleSignIn } from "@/features/auth/api/useGoogleSignIn";
import { googleClientId } from "@/features/auth/googleClientId";
import {
  googleSignInErrorMessage,
  isSuspendedError,
  type GoogleAuthResponse,
} from "@nearcommerce/api";
import { useResolvedTheme } from "@nearcommerce/ui";
import { GoogleLogin, GoogleOAuthProvider } from "@react-oauth/google";
import React, { useLayoutEffect, useRef, useState } from "react";

// Google draws its button in an iframe, so the stylesheet cannot restyle it. Google also does not
// allow custom colours or fonts, only its own variants and a pixel width between 200 and 400.
const MIN_WIDTH = 200;
const MAX_WIDTH = 400;
const FALLBACK_WIDTH = 320;

export interface GoogleSignInFailure {
  message: string;
  // The account is suspended, so the form can offer "Contact support".
  suspended: boolean;
}

// "or  [Continue with Google]". Renders nothing unless a Google client id is configured, so
// deployments without Google set up show no half-working button.
export const GoogleSignInButton: React.FC<{
  onSignedIn: (data: GoogleAuthResponse) => void;
  onError: (failure: GoogleSignInFailure) => void;
}> = ({ onSignedIn, onError }) => {
  const signIn = useGoogleSignIn();
  // Google's variants for a light page and a dark page, switched with the app's theme toggle.
  const theme = useResolvedTheme() === "dark" ? "filled_black" : "outline";
  // Fit the form's width, so the button lines up with the fields above it.
  const rowRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(FALLBACK_WIDTH);
  useLayoutEffect(() => {
    const row = rowRef.current;
    if (!row) return;
    const measure = () => {
      const available = Math.round(row.clientWidth);
      if (available > 0)
        setWidth(Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, available)));
    };
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(row);
    return () => observer.disconnect();
  }, []);
  if (!googleClientId) return null;

  return (
    <GoogleOAuthProvider clientId={googleClientId}>
      <div className="space-y-4" data-testid="google-sign-in">
        <div className="flex items-center gap-3 text-xs uppercase tracking-wide text-slate-500">
          <span className="h-px flex-1 bg-slate-200" />
          or
          <span className="h-px flex-1 bg-slate-200" />
        </div>
        <div
          ref={rowRef}
          className="flex justify-center"
          aria-busy={signIn.isPending}
        >
          {signIn.isPending ? (
            <p role="status" className="py-2.5 text-sm text-slate-600">
              Signing in with Google…
            </p>
          ) : (
            <GoogleLogin
              text="continue_with"
              shape="rectangular"
              theme={theme}
              size="large"
              width={width}
              onSuccess={({ credential }) => {
                if (!credential)
                  return onError({
                    message: "Google did not return a sign-in. Try again.",
                    suspended: false,
                  });
                signIn.mutate(credential, {
                  onSuccess: onSignedIn,
                  onError: (error) =>
                    onError({
                      message: googleSignInErrorMessage(error),
                      suspended: isSuspendedError(error),
                    }),
                });
              }}
              onError={() =>
                onError({
                  message:
                    "Google sign-in was cancelled or could not start. Please try again.",
                  suspended: false,
                })
              }
            />
          )}
        </div>
      </div>
    </GoogleOAuthProvider>
  );
};
