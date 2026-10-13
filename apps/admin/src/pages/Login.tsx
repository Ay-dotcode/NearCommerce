import { persistSession } from "@/session";
import {
  apiClient,
  loginErrorMessage,
  UserRole,
  type AuthResponse,
} from "@nearcommerce/api";
import { BrandIcon, Button, FormTextField } from "@nearcommerce/ui";
import { FormikProvider, useFormik } from "formik";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import * as Yup from "yup";

const schema = Yup.object({
  email: Yup.string()
    .trim()
    .email("Enter a valid email address")
    .required("Email is required"),
  password: Yup.string().required("Password is required"),
});

// Admin-only login page. Accepts only SYSTEM_ADMIN credentials: any other
// role receives a clear "Access denied" error rather than a silent failure.
export default function LoginPage() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  const formik = useFormik({
    initialValues: { email: "", password: "" },
    validationSchema: schema,
    onSubmit: async (values) => {
      setError(null);
      try {
        const { data } = await apiClient.post<AuthResponse>("/auth/login", {
          email: values.email.trim(),
          password: values.password,
        });

        if (data.user.role !== UserRole.SYSTEM_ADMIN) {
          setError("Access denied. This portal is for System Admins only.");
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
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-8 shadow-overlay">
        <BrandIcon size={48} className="rounded-2xl shadow-card" />
        <p className="mt-4 text-xs font-semibold uppercase tracking-[0.2em] text-brand-700">
          NearCommerce
        </p>
        <h1 className="mt-1 text-2xl font-bold">System Admin Portal</h1>
        <p className="mt-1 text-sm text-slate-500">
          Restricted access — admins only.
        </p>

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
      </div>
    </div>
  );
}
