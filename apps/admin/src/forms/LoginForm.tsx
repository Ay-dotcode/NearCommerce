import {
  ACCESS_DENIED_MESSAGE,
  loginInitialValues,
  loginSchema,
} from "@/forms/login.form";
import { persistSession } from "@/session";
import {
  apiClient,
  loginErrorMessage,
  UserRole,
  type AuthResponse,
} from "@nearcommerce/api";
import { Button, FormTextField } from "@nearcommerce/ui";
import { FormikProvider, useFormik } from "formik";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

// Admin sign-in form. Accepts only SYSTEM_ADMIN credentials: any other role receives a clear
// "Access denied" error rather than a silent failure.
export function LoginForm() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  const formik = useFormik({
    initialValues: loginInitialValues,
    validationSchema: loginSchema,
    onSubmit: async (values) => {
      setError(null);
      try {
        const { data } = await apiClient.post<AuthResponse>("/auth/login", {
          email: values.email.trim(),
          password: values.password,
        });

        if (data.user.role !== UserRole.SYSTEM_ADMIN) {
          setError(ACCESS_DENIED_MESSAGE);
          return;
        }

        persistSession(data.access_token, data.refresh_token);
        navigate("/dashboard", { replace: true });
      } catch (err) {
        setError(loginErrorMessage(err));
      }
    },
  });

  return (
    <FormikProvider value={formik}>
      <form
        onSubmit={formik.handleSubmit}
        noValidate
        className="mt-6 flex flex-col gap-4"
      >
        <FormTextField
          name="email"
          type="email"
          label="Email"
          autoComplete="username"
          data-autofocus
        />
        <FormTextField
          name="password"
          type="password"
          label="Password"
          autoComplete="current-password"
        />

        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}

        <Button type="submit" loading={formik.isSubmitting}>
          {formik.isSubmitting ? "Signing in…" : "Sign in"}
        </Button>
      </form>
    </FormikProvider>
  );
}
