import { Button, TextField } from "@/components/ui";
import { AppRoutes } from "@/constants/routes";
import { useResendVerification } from "@/features/auth/api/useEmailVerification";
import { useRegister } from "@/features/auth/api/useRegister";
import { AuthLayout } from "@/features/auth/ui/AuthLayout";
import { UserRole } from "@nearcommerce/api";
import { useFormik } from "formik";
import React, { useState } from "react";
import { Link } from "react-router-dom";

const EMAIL_PATTERN = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;

// Accounts created in the store portal are always store owners; shoppers register in the mobile app.
export const RegisterForm: React.FC = () => {
  const registerMutation = useRegister();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [registeredEmail, setRegisteredEmail] = useState("");
  const resend = useResendVerification();

  const formik = useFormik({
    initialValues: { full_name: "", email: "", password: "" },
    validate: (values) => {
      const errors: Partial<typeof values> = {};
      if (!values.full_name.trim()) errors.full_name = "Full name is required";
      else if (values.full_name.trim().length < 2)
        errors.full_name = "Full name must be at least 2 characters";

      if (!values.email) errors.email = "Email is required";
      else if (!EMAIL_PATTERN.test(values.email))
        errors.email = "Invalid email address";

      if (!values.password) errors.password = "Password is required";
      else if (values.password.length < 8)
        errors.password = "Password must be at least 8 characters";
      return errors;
    },
    onSubmit: (values, { setSubmitting }) => {
      setServerError(null);
      registerMutation.mutate(
        {
          ...values,
          full_name: values.full_name.trim(),
          role: UserRole.STORE_OWNER,
        },
        {
          onSuccess: (data) => {
            setRegisteredEmail(values.email);
            setSuccessMessage(data.message);
            setSubmitting(false);
          },
          onError: (error: any) => {
            setServerError(
              error.response?.data?.error ||
                "Registration failed. Please try again.",
            );
            setSubmitting(false);
          },
        },
      );
    },
  });

  const error = (name: keyof typeof formik.values) =>
    formik.touched[name] || formik.submitCount > 0
      ? formik.errors[name]
      : undefined;
  const busy = formik.isSubmitting || registerMutation.isPending;

  return (
    <AuthLayout
      title="Create your store account"
      subtitle="Set up your account, then add your store and products."
    >
      {successMessage ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-emerald-900">
          <h2 className="font-semibold">Account created</h2>
          <p className="mt-1 text-sm">{successMessage}</p>
          <p className="mt-2 text-sm">
            Didn't get it?{" "}
            <button
              type="button"
              className="font-medium underline disabled:opacity-60"
              disabled={resend.isPending}
              onClick={() => resend.mutate(registeredEmail)}
            >
              Resend verification email
            </button>
          </p>
          {resend.isSuccess && (
            <p role="status" className="mt-1 text-sm">
              {resend.data.message}
            </p>
          )}
          <Link
            to={AppRoutes.login}
            className="mt-3 inline-block text-sm font-medium underline"
          >
            Go to login
          </Link>
        </div>
      ) : (
        <form onSubmit={formik.handleSubmit} noValidate className="space-y-4">
          <TextField
            label="Full name"
            required
            autoComplete="name"
            placeholder="Jane Doe"
            {...formik.getFieldProps("full_name")}
            error={error("full_name")}
          />
          <TextField
            label="Email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
            {...formik.getFieldProps("email")}
            error={error("email")}
          />
          <TextField
            label="Password"
            type="password"
            required
            autoComplete="new-password"
            hint="At least 8 characters."
            {...formik.getFieldProps("password")}
            error={error("password")}
          />

          {serverError && (
            <div
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
            >
              {serverError}
            </div>
          )}

          <Button type="submit" className="w-full" loading={busy}>
            {busy ? "Registering…" : "Create account"}
          </Button>

          <p className="text-center text-sm text-slate-600">
            Already have an account?{" "}
            <Link
              to={AppRoutes.login}
              className="font-medium text-brand-700 hover:underline"
            >
              Log in
            </Link>
          </p>
        </form>
      )}
    </AuthLayout>
  );
};
