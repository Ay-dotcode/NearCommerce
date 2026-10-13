import { loginErrorMessage } from "@/api/errors";
import AuthLink from "@/components/auth/AuthLink";
import AuthScreen from "@/components/auth/AuthScreen";
import { Button, FormError, FormTextField } from "@/components/ui";
import { useAuth } from "@/src/context/AuthContext";
import { apiClient, type AuthResponse } from "@nearcommerce/api";
import { FormikProvider, useFormik } from "formik";
import { router } from "expo-router";
import * as Yup from "yup";

const schema = Yup.object({
  email: Yup.string().trim().required("Enter your email."),
  password: Yup.string().required("Enter your password."),
});

export default function LoginScreen() {
  const { login } = useAuth();

  const formik = useFormik({
    initialValues: { email: "", password: "" },
    validationSchema: schema,
    validateOnChange: false,
    onSubmit: async (values, helpers) => {
      helpers.setStatus(undefined);
      try {
        const res = await apiClient.post<AuthResponse>("/auth/login", {
          email: values.email.trim().toLowerCase(),
          password: values.password,
        });
        await login(res.data.access_token, res.data.refresh_token);
        router.replace("/(tabs)");
      } catch (err) {
        // Shown inside the form (banner + red fields), never in a pop-up.
        helpers.setStatus({ form: loginErrorMessage(err) });
      }
    },
  });

  const failed = Boolean(formik.status?.form);

  return (
    <AuthScreen
      title="Welcome back"
      subtitle="Sign in to discover local stores and products."
    >
      <FormikProvider value={formik}>
        <FormTextField
          name="email"
          testID="email-input"
          label="Email"
          placeholder="you@example.com"
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
          returnKeyType="next"
          invalid={failed}
        />
        <FormTextField
          name="password"
          testID="password-input"
          label="Password"
          placeholder="Your password"
          secureTextEntry
          autoComplete="password"
          returnKeyType="done"
          onSubmitEditing={() => formik.handleSubmit()}
          invalid={failed}
        />

        <AuthLink
          testID="forgot-password-link"
          label="Forgot password?"
          align="flex-end"
          onPress={() => router.push("/(auth)/forgot-password")}
        />

        <FormError message={formik.status?.form} />

        <Button
          testID="login-button"
          title="Sign in"
          loading={formik.isSubmitting}
          onPress={() => formik.handleSubmit()}
        />

        <AuthLink
          prefix="Don't have an account? "
          label="Create one"
          onPress={() => router.push("/(auth)/register")}
        />
      </FormikProvider>
    </AuthScreen>
  );
}
