import { useLogin } from "@/features/auth/api/useLogin";
import { ErrorMessage, Field, Form, Formik } from "formik";
import React from "react";
import { useNavigate } from "react-router-dom";

/**
 * LoginForm
 *
 * Renders the NearCommerce Portal login screen.  On submission it calls the
 * `/auth/login` mutation and performs RBAC-aware routing:
 *   - SYSTEM_ADMIN  → /admin/dashboard (master oversight portal)
 *   - STORE_OWNER   → /owner/dashboard  (inventory management, X-Store-ID set)
 *
 * Any unrecognised role produces an inline error rather than a silent redirect.
 */
export const LoginForm: React.FC = () => {
  const navigate = useNavigate();
  const loginMutation = useLogin();

  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-white shadow-md rounded-md">
      <h2 className="text-2xl font-bold mb-4">NearCommerce Portal</h2>
      <Formik
        initialValues={{ email: "", password: "" }}
        validate={(values) => {
          const errors: Partial<typeof values> = {};
          if (!values.email) errors.email = "Required";
          if (!values.password) errors.password = "Required";
          return errors;
        }}
        onSubmit={(values, { setSubmitting, setStatus }) => {
          loginMutation.mutate(values, {
            onSuccess: (data) => {
              // RBAC-aware routing
              if (data.user.role === "SYSTEM_ADMIN") {
                navigate("/admin/dashboard");
              } else if (data.user.role === "STORE_OWNER") {
                navigate("/owner/dashboard");
              } else {
                setStatus("Unauthorized role for web portal.");
                setSubmitting(false);
              }
            },
            onError: () => {
              setStatus("Invalid email or password.");
              setSubmitting(false);
            },
          });
        }}
      >
        {({ isSubmitting, status }) => (
          <Form className="flex flex-col gap-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium">
                Email
              </label>
              <Field
                id="email"
                type="email"
                name="email"
                className="border p-2 rounded w-full"
              />
              <ErrorMessage
                name="email"
                component="div"
                className="text-red-500 text-sm"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium">
                Password
              </label>
              <Field
                id="password"
                type="password"
                name="password"
                className="border p-2 rounded w-full"
              />
              <ErrorMessage
                name="password"
                component="div"
                className="text-red-500 text-sm"
              />
            </div>

            {status && (
              <div role="alert" className="text-red-500 text-sm">
                {status}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting || loginMutation.isPending}
              className="bg-blue-600 text-white p-2 rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {isSubmitting || loginMutation.isPending
                ? "Logging in..."
                : "Login"}
            </button>
          </Form>
        )}
      </Formik>
    </div>
  );
};
