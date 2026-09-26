import { AppRoutes } from "@/constants/routes";
import { useVerifyEmail } from "@/features/auth/api/useVerifyEmail";
import React, { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

export const VerifyEmailPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const verifyMutation = useVerifyEmail();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (token) {
      verifyMutation.mutate(token, {
        onError: (err: any) => {
          const msg =
            err.response?.data?.error ||
            "Verification failed. The token may be expired or invalid.";
          setErrorMessage(msg);
        },
      });
    }
  }, [token]);

  return (
    <div className="max-w-md mx-auto mt-16 p-8 bg-white shadow-md rounded-md text-center">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">Email Verification</h2>

      {!token ? (
        <div className="text-amber-600 bg-amber-50 p-4 rounded-md">
          <p className="font-medium">No verification token found in URL.</p>
          <p className="text-sm mt-1">Please use the exact link sent to your email.</p>
        </div>
      ) : verifyMutation.isPending ? (
        <div className="text-gray-600">
          <p className="text-base font-medium animate-pulse">Verifying your token...</p>
        </div>
      ) : verifyMutation.isSuccess ? (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-6 rounded-md">
          <h3 className="text-xl font-bold text-emerald-900 mb-2">🎉 Email Verified!</h3>
          <p className="text-sm mb-4">
            Your email has been successfully verified. You can now log into your account.
          </p>
          <Link
            to={AppRoutes.login}
            className="inline-block bg-emerald-600 text-white px-5 py-2 rounded-md font-medium hover:bg-emerald-700 transition"
          >
            Go to Login
          </Link>
        </div>
      ) : (
        <div className="bg-red-50 border border-red-200 text-red-800 p-6 rounded-md">
          <h3 className="text-lg font-bold text-red-900 mb-2">Verification Failed</h3>
          <p className="text-sm mb-4">{errorMessage}</p>
          <Link
            to={AppRoutes.login}
            className="inline-block bg-gray-800 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-900 transition"
          >
            Back to Login
          </Link>
        </div>
      )}
    </div>
  );
};
