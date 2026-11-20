import { useGoogleSignIn } from "@/features/auth/api/useGoogleSignIn";
import { googleClientId } from "@/features/auth/googleClientId";
import {
  googleSignInErrorMessage,
  isSuspendedError,
  type GoogleAuthResponse,
} from "@nearcommerce/api";
import { GoogleLogin, GoogleOAuthProvider } from "@react-oauth/google";
import React from "react";

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
  if (!googleClientId) return null;

  return (
    <GoogleOAuthProvider clientId={googleClientId}>
      <div className="space-y-4" data-testid="google-sign-in">
        <div className="flex items-center gap-3 text-xs uppercase tracking-wide text-slate-500">
          <span className="h-px flex-1 bg-slate-200" />
          or
          <span className="h-px flex-1 bg-slate-200" />
        </div>
        <div className="flex justify-center" aria-busy={signIn.isPending}>
          {signIn.isPending ? (
            <p role="status" className="py-2.5 text-sm text-slate-600">
              Signing in with Google…
            </p>
          ) : (
            <GoogleLogin
              text="continue_with"
              shape="rectangular"
              theme="outline"
              size="large"
              width="320"
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
