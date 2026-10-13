import AuthLink from "@/components/auth/AuthLink";
import AuthScreen from "@/components/auth/AuthScreen";
import { Button, FormError, FormTextField } from "@/components/ui";
import { useAuth } from "@/src/context/AuthContext";
import { apiClient, type AuthResponse } from "@nearcommerce/api";
import { router } from "expo-router";
import { FormikProvider, useFormik } from "formik";
import Toast from "react-native-toast-message";
import * as Yup from "yup";

const schema = Yup.object({
  fullName: Yup.string().trim().required("Enter your full name."),
  email: Yup.string()
    .trim()
    .email("Enter a valid email address.")
    .required("Enter your email."),
  password: Yup.string()
    .min(8, "Password must be at least 8 characters.")
    .required("Choose a password."),
});

export default function RegisterScreen() {
  const { login } = useAuth();

  const formik = useFormik({
    initialValues: { fullName: "", email: "", password: "" },
    validationSchema: schema,
    validateOnChange: false,
    onSubmit: async (values, helpers) => {
      helpers.setStatus(undefined);
      const email = values.email.trim().toLowerCase();
      try {
        // Register; the backend emails a verification link
        await apiClient.post("/auth/register", {
          full_name: values.fullName.trim(),
          email,
          password: values.password,
        });
        // Immediately log in to get a token
        const res = await apiClient.post<AuthResponse>("/auth/login", {
          email,
          password: values.password,
        });
        await login(res.data.access_token, res.data.refresh_token);
        Toast.show({
          type: "info",
          text1: "Check your email",
          text2: "Tap the link we sent to verify your account.",
        });
        router.replace("/(tabs)");
      } catch (err: any) {
        const message =
          err?.response?.data?.error ??
          "Registration failed. Please try again.";
        // Problems the server ties to a field show on that field; the rest in the banner.
        const details: { path?: string; message?: string }[] =
          err?.response?.data?.details ?? [];
        const fieldMap: Record<string, string> = {
          full_name: "fullName",
          email: "email",
          password: "password",
        };
        const errors: Record<string, string> = {};
        for (const d of details)
          if (d.path && fieldMap[d.path] && d.message)
            errors[fieldMap[d.path]] ??= d.message;
        if (err?.response?.status === 409) errors.email ??= message;
        helpers.setErrors(errors);
        if (Object.keys(errors).length === 0)
          helpers.setStatus({ form: message });
      }
    },
  });

  return (
    <AuthScreen
      title="Create account"
      subtitle="Discover local stores and plan shopping trips."
    >
      <FormikProvider value={formik}>
        <FormTextField
          name="fullName"
          testID="fullname-input"
          label="Full Name"
          placeholder="e.g. Jane Doe"
          autoComplete="name"
          returnKeyType="next"
        />
        <FormTextField
          name="email"
          testID="email-input"
          label="Email"
          placeholder="you@example.com"
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
          returnKeyType="next"
        />
        <FormTextField
          name="password"
          testID="password-input"
          label="Password"
          placeholder="At least 8 characters"
          secureTextEntry
          autoComplete="new-password"
          returnKeyType="done"
          onSubmitEditing={() => formik.handleSubmit()}
        />

        <FormError message={formik.status?.form} />

        <Button
          testID="register-button"
          title="Create account"
          loading={formik.isSubmitting}
          onPress={() => formik.handleSubmit()}
        />

        <AuthLink
          prefix="Already have an account? "
          label="Sign in"
          onPress={() => router.push("/(auth)/login")}
        />
      </FormikProvider>
    </AuthScreen>
  );
}
