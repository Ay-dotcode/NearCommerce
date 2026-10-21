import { Button, TextField } from "@nearcommerce/ui";
import { AppRoutes } from "@/constants/routes";
import { useLogin } from "@/features/auth/api/useLogin";
import { clearSession, getUserRole } from "@/features/auth/session";
import { AuthLayout } from "@/features/auth/ui/AuthLayout";
import {
  isSuspendedError,
  loginErrorMessage,
  UserRole,
} from "@nearcommerce/api";
import { SupportDialog } from "@/features/support/ui/SupportDialog";
import { useFormik } from "formik";
import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { safeReturnPath } from "@/helpers/authRedirect";
import { loginInitialValues, validateLogin } from "@/forms/login.form";

type Notice = {
  tone: "error" | "info";
  title?: string;
  body: React.ReactNode;
  // A suspended account gets a "Contact support" link under the message.
  offerSupport?: boolean;
};

// Renders the Store Portal login. Only STORE_OWNER accounts can use this portal.
// Shoppers and administrators who sign in here are told where to go instead of
// being shown a bare "unauthorized" error, and no session is kept for them.
export const LoginForm: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const loginMutation = useLogin();
  const [notice, setNotice] = useState<Notice | null>(null);
  const [supportOpen, setSupportOpen] = useState(false);

  const returnTo = safeReturnPath(
    (location.state as { from?: string } | null)?.from,
  );

  useEffect(() => {
    if (getUserRole() === UserRole.STORE_OWNER)
      navigate(returnTo, { replace: true });
  }, [navigate, returnTo]);

  const formik = useFormik({
    initialValues: loginInitialValues,
    validate: validateLogin,
    onSubmit: (values, { setSubmitting }) => {
      setNotice(null);
      loginMutation.mutate(values, {
        onSuccess: (data) => {
          setSubmitting(false);
          if (data.user.role === UserRole.STORE_OWNER)
            return navigate(returnTo);

          // useLogin keeps admin sessions for the admin app; this portal must not hold one.
          clearSession();
          if (data.user.role === UserRole.SYSTEM_ADMIN)
            setNotice({
              tone: "info",
              title: "This is the store portal",
              body: "Administrator accounts sign in through the admin console, not here.",
            });
          else
            setNotice({
              tone: "info",
              title: "This portal is for store owners",
              body: (
                <>
                  Your account is a shopper account. Shopping and household
                  lists live in the Near Commerce mobile app. To sell here,{" "}
                  <Link
                    className="font-medium underline"
                    to={AppRoutes.register}
                  >
                    create a store owner account
                  </Link>{" "}
                  with a different email.
                </>
              ),
            });
        },
        onError: (err) => {
          setSubmitting(false);
          setNotice({
            tone: "error",
            body: loginErrorMessage(err),
            offerSupport: isSuspendedError(err),
          });
        },
      });
    },
  });

  const error = (name: "email" | "password") =>
    formik.touched[name] || formik.submitCount > 0
      ? formik.errors[name]
      : undefined;
  const busy = formik.isSubmitting || loginMutation.isPending;

  return (
    <AuthLayout
      title="Log in to your store"
      subtitle="Manage your inventory and keep shoppers up to date."
    >
      <form onSubmit={formik.handleSubmit} noValidate className="space-y-4">
        <TextField
          label="Email"
          type="email"
          required
          autoComplete="email"
          {...formik.getFieldProps("email")}
          error={error("email")}
        />
        <TextField
          label="Password"
          type="password"
          required
          autoComplete="current-password"
          {...formik.getFieldProps("password")}
          error={error("password")}
        />
        <div className="-mt-2 text-right">
          <Link
            to={AppRoutes.forgotPassword}
            className="text-sm font-medium text-brand-700 hover:underline"
          >
            Forgot password?
          </Link>
        </div>

        {notice && (
          <div
            role="alert"
            className={
              notice.tone === "error"
                ? "rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
                : "rounded-lg border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-900"
            }
          >
            {notice.title && <p className="font-semibold">{notice.title}</p>}
            <p>{notice.body}</p>
            {notice.offerSupport && (
              <button
                type="button"
                onClick={() => setSupportOpen(true)}
                className="mt-2 font-semibold underline focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
              >
                Contact support
              </button>
            )}
          </div>
        )}

        <Button type="submit" className="w-full" loading={busy}>
          {busy ? "Logging in…" : "Login"}
        </Button>

        <p className="text-center text-sm text-slate-600">
          Don&apos;t have a store account?{" "}
          <Link
            to={AppRoutes.register}
            className="font-medium text-brand-700 hover:underline"
          >
            Create one
          </Link>
        </p>
      </form>
      <SupportDialog open={supportOpen} onClose={() => setSupportOpen(false)} />
    </AuthLayout>
  );
};
