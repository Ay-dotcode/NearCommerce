import { parseApiError } from "@/api/errors";
import { Button, TextField } from "@/components/ui";
import { AppRoutes } from "@/constants/routes";
import { useForgotPassword } from "@/features/auth/api/usePasswordReset";
import { useFormik } from "formik";
import React from "react";
import { Link } from "react-router-dom";
import { AuthLayout } from "./AuthLayout";

const EMAIL_PATTERN = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;

// Asks for an email and always shows the same confirmation, so the form never reveals which emails are registered.
export const ForgotPasswordForm: React.FC = () => {
  const forgot = useForgotPassword();

  const formik = useFormik({
    initialValues: { email: "" },
    validate: ({ email }) => {
      if (!email.trim()) return { email: "Email is required" };
      if (!EMAIL_PATTERN.test(email.trim()))
        return { email: "Enter a valid email address" };
      return {};
    },
    onSubmit: (values) => forgot.mutate(values.email.trim().toLowerCase()),
  });

  const fieldError =
    formik.touched.email || formik.submitCount > 0
      ? formik.errors.email
      : undefined;
  const serverError = forgot.isError ? parseApiError(forgot.error) : null;

  return (
    <AuthLayout
      title="Reset your password"
      subtitle="Enter the email you signed up with and we'll send you a reset link."
    >
      {forgot.isSuccess ? (
        <div
          role="status"
          className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-emerald-900"
        >
          <h2 className="font-semibold">Check your email</h2>
          <p className="mt-1 text-sm">
            If that email is registered, a reset link is on its way. The link
            works for one hour.
          </p>
          <Link
            to={AppRoutes.login}
            className="mt-3 inline-block text-sm font-medium underline"
          >
            Back to login
          </Link>
        </div>
      ) : (
        <form onSubmit={formik.handleSubmit} noValidate className="space-y-4">
          <TextField
            label="Email"
            type="email"
            required
            autoComplete="email"
            {...formik.getFieldProps("email")}
            error={fieldError}
          />
          {serverError && (
            <div
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
            >
              {serverError.status === 429
                ? "Too many requests. Please wait a few minutes and try again."
                : "We couldn't send the reset link. Please try again."}
            </div>
          )}
          <Button type="submit" className="w-full" loading={forgot.isPending}>
            {forgot.isPending ? "Sending…" : "Send reset link"}
          </Button>
          <p className="text-center text-sm text-slate-600">
            Remembered it?{" "}
            <Link
              to={AppRoutes.login}
              className="font-medium text-brand-700 hover:underline"
            >
              Back to login
            </Link>
          </p>
        </form>
      )}
    </AuthLayout>
  );
};
