import { AppRoutes } from "@/constants/routes";
import { useRegister } from "@/features/auth/api/useRegister";
import { ErrorMessage, Field, Form, Formik } from "formik";
import React, { useState } from "react";
import { Link } from "react-router-dom";

export const RegisterForm: React.FC = () => {
  const registerMutation = useRegister();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-white shadow-md rounded-md">
      <h2 className="text-2xl font-bold mb-2">Create an Account</h2>
      <p className="text-sm text-gray-600 mb-6">
        Sign up to test email verification and get started.
      </p>

      {successMessage ? (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-md">
          <h3 className="font-semibold text-emerald-900 mb-1">Check your email!</h3>
          <p className="text-sm mb-3">{successMessage}</p>
          <Link
            to={AppRoutes.login}
            className="inline-block text-sm font-medium text-emerald-700 underline hover:text-emerald-900"
          >
            Return to Login
          </Link>
        </div>
      ) : (
        <Formik
          initialValues={{ full_name: "", email: "", password: "" }}
          validate={(values) => {
            const errors: Partial<typeof values> = {};
            if (!values.full_name) errors.full_name = "Full name is required";
            else if (values.full_name.length < 2)
              errors.full_name = "Full name must be at least 2 characters";

            if (!values.email) errors.email = "Email is required";
            else if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(values.email))
              errors.email = "Invalid email address";

            if (!values.password) errors.password = "Password is required";
            else if (values.password.length < 8)
              errors.password = "Password must be at least 8 characters";

            return errors;
          }}
          onSubmit={(values, { setSubmitting, setStatus }) => {
            setStatus(null);
            registerMutation.mutate(values, {
              onSuccess: (data) => {
                setSuccessMessage(data.message);
                setSubmitting(false);
              },
              onError: (error: any) => {
                const message =
                  error.response?.data?.error ||
                  "Registration failed. Please try again.";
                setStatus(message);
                setSubmitting(false);
              },
            });
          }}
        >
          {({ isSubmitting, status }) => (
            <Form className="flex flex-col gap-4">
              <div>
                <label htmlFor="full_name" className="block text-sm font-medium text-gray-700">
                  Full Name
                </label>
                <Field
                  id="full_name"
                  type="text"
                  name="full_name"
                  placeholder="e.g. Jane Doe"
                  className="border p-2 rounded w-full mt-1 border-gray-300"
                />
                <ErrorMessage
                  name="full_name"
                  component="div"
                  className="text-red-500 text-sm mt-1"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email
                </label>
                <Field
                  id="email"
                  type="email"
                  name="email"
                  placeholder="you@example.com"
                  className="border p-2 rounded w-full mt-1 border-gray-300"
                />
                <ErrorMessage
                  name="email"
                  component="div"
                  className="text-red-500 text-sm mt-1"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <Field
                  id="password"
                  type="password"
                  name="password"
                  placeholder="At least 8 characters"
                  className="border p-2 rounded w-full mt-1 border-gray-300"
                />
                <ErrorMessage
                  name="password"
                  component="div"
                  className="text-red-500 text-sm mt-1"
                />
              </div>

              {status && (
                <div role="alert" className="text-red-600 bg-red-50 p-2 rounded border border-red-200 text-sm">
                  {status}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting || registerMutation.isPending}
                className="bg-blue-600 text-white p-2.5 rounded font-medium hover:bg-blue-700 disabled:opacity-50 transition"
              >
                {isSubmitting || registerMutation.isPending
                  ? "Registering..."
                  : "Create Account"}
              </button>

              <div className="text-center text-sm text-gray-600 mt-2">
                Already have an account?{" "}
                <Link to={AppRoutes.login} className="text-blue-600 font-medium hover:underline">
                  Log in
                </Link>
              </div>
            </Form>
          )}
        </Formik>
      )}
    </div>
  );
};
