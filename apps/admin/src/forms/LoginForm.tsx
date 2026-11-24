import {
  ACCESS_DENIED_MESSAGE,
  loginInitialValues,
  loginSchema,
} from "@/forms/login.form";
import { AdminGoogleSignInButton } from "@/components/AdminGoogleSignInButton";
import { persistSession } from "@/session";
import {
  apiClient,
  loginErrorMessage,
  UserRole,
  type AuthResponse,
  type GoogleAuthResponse,
} from "@nearcommerce/api";
import {
  BusyFieldset,
  Button,
  FormPasswordField,
  FormTextField,
} from "@nearcommerce/ui";
import { FormikProvider, useFormik } from "formik";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

// Admin sign-in form. Accepts SYSTEM_ADMIN credentials via email+password or Google.
// Any other role receives a clear "Access denied" error rather than a silent failure.
export function LoginForm() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  const handleSignedIn = (data: AuthResponse | GoogleAuthResponse) => {
    if (data.user.role !== UserRole.SYSTEM_ADMIN) {
      setError(ACCESS_DENIED_MESSAGE);
      return;
    }
    persistSession(data.access_token, data.refresh_token);
    navigate("/dashboard", { replace: true });
  };

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

        handleSignedIn(data);
      } catch (err) {
        setError(loginErrorMessage(err));
      }
    },
  });

  return (
    <FormikProvider value={formik}>
      <form onSubmit={formik.handleSubmit} noValidate>
        <BusyFieldset
          busy={formik.isSubmitting}
          className="mt-6 flex flex-col gap-4"
        >
          <FormTextField
            name="email"
            type="email"
            label="Email"
            autoComplete="username"
            data-autofocus
          />
          <FormPasswordField
            name="password"
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

          <AdminGoogleSignInButton
            onSignedIn={handleSignedIn}
            onError={({ message }) => setError(message)}
          />
        </BusyFieldset>
      </form>
    </FormikProvider>
  );
}
