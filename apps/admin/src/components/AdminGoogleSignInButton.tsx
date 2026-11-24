import { useAdminGoogleSignIn } from "@/api/useAdminGoogleSignIn";
import { googleClientId } from "@/googleClientId";
import {
  googleSignInErrorMessage,
  isSuspendedError,
  type GoogleAuthResponse,
} from "@nearcommerce/api";
import { Spinner } from "@nearcommerce/ui";
import {
  GoogleLogin,
  GoogleOAuthProvider,
  type CredentialResponse,
} from "@react-oauth/google";
import React, { useLayoutEffect, useRef, useState } from "react";

const MIN_WIDTH = 200;
const MAX_WIDTH = 400;
const FALLBACK_WIDTH = 320;

export interface GoogleSignInFailure {
  message: string;
  suspended: boolean;
}

export const AdminGoogleSignInButton: React.FC<{
  onSignedIn: (data: GoogleAuthResponse) => void;
  onError: (failure: GoogleSignInFailure) => void;
}> = ({ onSignedIn, onError }) => {
  const signIn = useAdminGoogleSignIn();
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
            <div
              role="status"
              className="flex items-center justify-center gap-2 rounded-md border border-slate-200 bg-slate-50 py-2.5 px-4 text-sm font-medium text-slate-700 shadow-sm"
              style={{ width }}
            >
              <Spinner className="h-5 w-5 text-brand-600" />
              <span>Signing in with Google…</span>
            </div>
          ) : (
            <GoogleLogin
              text="continue_with"
              shape="rectangular"
              theme="outline"
              size="large"
              width={width}
              onSuccess={({ credential }: CredentialResponse) => {
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
