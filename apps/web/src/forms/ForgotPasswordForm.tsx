import { AppRoutes } from "@/constants/routes";
import { AuthLayout } from "@/features/auth/ui/AuthLayout";
import { SupportDialog } from "@/features/support/ui/SupportDialog";
import React, { useState } from "react";
import { Link } from "react-router-dom";

// Email and password-reset functionality is disabled on this mock application.
// A pop-up explains that password reset is disabled and provides support contact channels.
export const ForgotPasswordForm: React.FC = () => {
  const [supportOpen, setSupportOpen] = useState(false);

  return (
    <AuthLayout
      title="Reset your password"
      backTo={AppRoutes.login}
      subtitle="Password reset is disabled on this mock application."
    >
      <div className="space-y-4">
        <div
          role="status"
          className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-900"
        >
          <h2 className="font-semibold">Feature Disabled</h2>
          <p className="mt-1 text-sm text-amber-800">
            Password reset via email is disabled on this mock app. Please
            contact support to recover access to your account.
          </p>
          <button
            type="button"
            onClick={() => setSupportOpen(true)}
            className="mt-3 inline-block text-sm font-semibold text-brand-700 underline focus:outline-none"
          >
            Contact support
          </button>
        </div>

        <p className="text-center text-sm text-slate-600">
          Remembered your password?{" "}
          <Link
            to={AppRoutes.login}
            className="font-medium text-brand-700 hover:underline"
          >
            Back to login
          </Link>
        </p>
      </div>

      <SupportDialog
        open={supportOpen}
        onClose={() => setSupportOpen(false)}
        title="Password reset disabled"
        description="Password reset is disabled on this mock application. Reach out to our support team for help."
      />
    </AuthLayout>
  );
};

