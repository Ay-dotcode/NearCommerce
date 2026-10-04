import { Button, TextField } from "@/components/ui";
import { AppRoutes } from "@/constants/routes";
import { useResetPassword } from "@/features/auth/api/usePasswordReset";
import { useFormik } from "formik";
import React from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AuthLayout } from "./AuthLayout";

// Landing page for the link in the reset email: /reset-password?token=...
export const ResetPasswordForm: React.FC = () => {
  const [params] = useSearchParams();
  const token = params.get("token")?.trim() ?? "";
  const reset = useResetPassword();

  const formik = useFormik({
    initialValues: { password: "", confirm: "" },
    validate: ({ password, confirm }) => {
      const errors: { password?: string; confirm?: string } = {};
      if (!password) errors.password = "Password is required";
      else if (password.length < 8)
        errors.password = "Password must be at least 8 characters";
      if (!confirm) errors.confirm = "Please confirm your password";
      else if (confirm !== password) errors.confirm = "Passwords do not match";
      return errors;
    },
    onSubmit: (values) =>
      reset.mutate({ token, new_password: values.password }),
  });

  const shown = (name: "password" | "confirm") =>
    formik.touched[name] || formik.submitCount > 0
      ? formik.errors[name]
      : undefined;

  if (!token)
    return (
      <AuthLayout
        title="Reset link missing"
        subtitle="Open the link from your email, or request a new one."
      >
        <Link
          to={AppRoutes.forgotPassword}
          className="text-sm font-medium text-brand-700 hover:underline"
        >
          Request a new reset link
        </Link>
      </AuthLayout>
    );

  if (reset.isSuccess)
    return (
      <AuthLayout title="Password updated">
        <div
          role="status"
          className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-emerald-900"
        >
          <p className="text-sm">
            Your password has been changed and you've been signed out
            everywhere. Log in with your new password.
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

  const status = (reset.error as { response?: { status?: number } } | null)
    ?.response?.status;

  return (
    <AuthLayout
      title="Choose a new password"
      subtitle="Use at least 8 characters."
    >
      <form onSubmit={formik.handleSubmit} noValidate className="space-y-4">
        <TextField
          label="New password"
          type="password"
          required
          autoComplete="new-password"
          {...formik.getFieldProps("password")}
          error={shown("password")}
        />
        <TextField
          label="Confirm new password"
          type="password"
          required
          autoComplete="new-password"
          {...formik.getFieldProps("confirm")}
          error={shown("confirm")}
        />
        {reset.isError && (
          <div
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          >
            {status === 400 ? (
              <>
                This reset link is invalid or has expired.{" "}
                <Link
                  to={AppRoutes.forgotPassword}
                  className="font-medium underline"
                >
                  Request a new one
                </Link>
                .
              </>
            ) : (
              "We couldn't reset your password. Please try again."
            )}
          </div>
        )}
        <Button type="submit" className="w-full" loading={reset.isPending}>
          {reset.isPending ? "Saving…" : "Reset password"}
        </Button>
      </form>
    </AuthLayout>
  );
};
