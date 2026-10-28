import { isSuspendedError, loginErrorMessage } from "@/api/errors";
import AuthLink from "@/components/auth/AuthLink";
import {
  Button,
  FormError,
  FormPasswordField,
  FormTextField,
} from "@/components/ui";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { loginInitialValues, loginSchema } from "@/forms/login.form";
import { useAuth } from "@/src/context/AuthContext";
import { useOptionalSettings } from "@/src/context/SettingsContext";
import { apiClient, type AuthResponse } from "@nearcommerce/api";
import { router } from "expo-router";
import { FormikProvider, useFormik } from "formik";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useThemedStyles, type ThemeColors } from "@/theme";

export function LoginForm() {
  const { login } = useAuth();
  const settings = useOptionalSettings();
  const styles = useThemedStyles(makeStyles);
  const [forgotSheetVisible, setForgotSheetVisible] = useState(false);

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

  const handleForgotPassword = () => {
    setForgotSheetVisible(true);
  };

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
        <FormPasswordField
          name="password"
          testID="password-input"
          label="Password"
          placeholder="Your password"
          autoComplete="password"
          returnKeyType="done"
          onSubmitEditing={() => formik.handleSubmit()}
          invalid={failed}
        />

        <AuthLink
          testID="forgot-password-link"
          label="Forgot password?"
          align="flex-end"
          onPress={handleForgotPassword}
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

      {/* Themed bottom sheet — matches every other pop-up in the app */}
      <BottomSheet
        testID="forgot-password-sheet"
        visible={forgotSheetVisible}
        onClose={() => setForgotSheetVisible(false)}
        title="Password Reset Disabled"
        description="Password reset via email is not available on this version of the app."
      >
        <View style={styles.sheetBody}>
          <Text style={styles.sheetText}>
            To recover access to your account please contact our support team.
            They will verify your identity and reset your password manually.
          </Text>

          {settings?.openSupport && (
            <Button
              testID="forgot-contact-support-button"
              title="Contact support"
              onPress={() => {
                setForgotSheetVisible(false);
                settings.openSupport();
              }}
            />
          )}

          <Button
            testID="forgot-sheet-close-button"
            title="Close"
            variant="secondary"
            onPress={() => setForgotSheetVisible(false)}
          />
        </View>
      </BottomSheet>
    </>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    sheetBody: { gap: 12, paddingBottom: 8 },
    sheetText: {
      color: c.textSecondary,
      fontSize: 14,
      lineHeight: 22,
    },
  });
