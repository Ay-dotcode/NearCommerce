import { AppRoutes } from "@/constants/routes";
import { useVerifyEmail } from "@/features/auth/api/useEmailVerification";
import { AuthLayout } from "@/features/auth/ui/AuthLayout";
import { parseApiError } from "@nearcommerce/api";
import { Skeleton, SkeletonGroup } from "@nearcommerce/ui";
import React, { useEffect, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";

// Landing page for the link in the verification email: /verify-email?token=...
// The token is single-use, so the request is sent exactly once even under StrictMode.
export const VerifyEmailPage: React.FC = () => {
  const [params] = useSearchParams();
  const token = params.get("token")?.trim() ?? "";
  const verify = useVerifyEmail();
  const sent = useRef(false);

  useEffect(() => {
    if (!token || sent.current) return;
    sent.current = true;
    verify.mutate(token);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  if (!token)
    return (
      <AuthLayout
        title="Verification link missing" backTo={AppRoutes.login}
        subtitle="Open the link from your email, or log in to request a new one."
      >
        <Link
          to={AppRoutes.login}
          className="text-sm font-medium text-brand-700 hover:underline"
        >
          Go to login
        </Link>
      </AuthLayout>
    );

  if (verify.isSuccess)
    return (
      <AuthLayout title="Email verified" backTo={AppRoutes.login}>
        <div
          role="status"
          className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-emerald-900"
        >
          <p className="text-sm">
            Thanks, your email address is confirmed. You can close this tab and
            return to the app, or log in here.
          </p>
          <Link
            to={AppRoutes.login}
            className="mt-3 inline-block text-sm font-medium underline"
          >
            Go to login
          </Link>
        </div>
      </AuthLayout>
    );

  if (verify.isError)
    return (
      <AuthLayout title="We couldn't verify your email" backTo={AppRoutes.login}>
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800"
        >
          <p className="text-sm">
            {parseApiError(verify.error).message ||
              "This link is invalid or has expired."}{" "}
            Log in and choose “Resend verification email” to get a new link.
          </p>
          <Link
            to={AppRoutes.login}
            className="mt-3 inline-block text-sm font-medium underline"
          >
            Go to login
          </Link>
        </div>
      </AuthLayout>
    );

  return (
    <AuthLayout title="Email verification" backTo={AppRoutes.login}>
      <SkeletonGroup label="Confirming your email" className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="mt-3 h-4 w-24" />
      </SkeletonGroup>
    </AuthLayout>
  );
};
