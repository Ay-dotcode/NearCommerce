import { isSuspendedError, loginErrorMessage } from "@/api/errors";
import AuthLink from "@/components/auth/AuthLink";
import { Button, FormError, FormTextField } from "@/components/ui";
import { loginInitialValues, loginSchema } from "@/forms/login.form";
import { useAuth } from "@/src/context/AuthContext";
import { useOptionalSettings } from "@/src/context/SettingsContext";
import { apiClient, type AuthResponse } from "@nearcommerce/api";
import { router } from "expo-router";
import { FormikProvider, useFormik } from "formik";

export function LoginForm() {
  const { login } = useAuth();
  const settings = useOptionalSettings();

  const formik = useFormik({
    initialValues: loginInitialValues,
    validationSchema: loginSchema,
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
        helpers.setStatus({
          form: loginErrorMessage(err),
          suspended: isSuspendedError(err),
        });
      }
    },
  });

  const failed = Boolean(formik.status?.form);

  return (
    <>
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
        {formik.status?.suspended && settings && (
          <AuthLink
            testID="contact-support-link"
            label="Contact support"
            align="flex-start"
            onPress={settings.openSupport}
          />
        )}

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
    </>
  );
}
