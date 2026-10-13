import { apiErrorMessage } from "@/api/errors";
import AuthLink from "@/components/auth/AuthLink";
import AuthScreen from "@/components/auth/AuthScreen";
import { Button, FormError, FormTextField } from "@/components/ui";
import { useThemedStyles, type ThemeColors } from "@/theme";
import { apiClient } from "@nearcommerce/api";
import { router, useLocalSearchParams } from "expo-router";
import { FormikProvider, useFormik } from "formik";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import * as Yup from "yup";

export default function ResetPasswordScreen() {
  const styles = useThemedStyles(makeStyles);
  const params = useLocalSearchParams<{ token?: string }>();
  const [done, setDone] = useState(false);

  const formik = useFormik({
    initialValues: { token: params.token ?? "", password: "", confirm: "" },
    validationSchema: Yup.object({
      token: Yup.string()
        .trim()
        .required("Paste the reset code from your email."),
      password: Yup.string()
        .min(8, "Password must be at least 8 characters.")
        .required("Password must be at least 8 characters."),
      confirm: Yup.string().oneOf(
        [Yup.ref("password")],
        "Passwords do not match.",
      ),
    }),
    validateOnChange: false,
    onSubmit: async (values, helpers) => {
      helpers.setStatus(undefined);
      try {
        await apiClient.post("/auth/reset-password", {
          token: values.token.trim(),
          new_password: values.password,
        });
        setDone(true);
      } catch (err) {
        const status = (err as { response?: { status?: number } })?.response
          ?.status;
        helpers.setStatus({
          form:
            status === 400
              ? "This reset code is invalid or has expired. Request a new link."
              : apiErrorMessage(
                  err,
                  "We couldn't reset your password. Please try again.",
                ),
        });
      }
    },
  });

  return (
    <AuthScreen title="Choose a new password">
      {done ? (
        <View style={styles.success} accessibilityRole="alert">
          <Text style={styles.successTitle}>Password updated</Text>
          <Text style={styles.successBody}>
            You've been signed out everywhere. Sign in with your new password.
          </Text>
          <AuthLink
            testID="go-to-login"
            label="Go to sign in"
            align="flex-end"
            onPress={() => router.replace("/(auth)/login")}
          />
        </View>
      ) : (
        <FormikProvider value={formik}>
          {!params.token && (
            <FormTextField
              name="token"
              testID="token-input"
              label="Reset code"
              placeholder="Paste the code from your email"
              autoCapitalize="none"
              autoCorrect={false}
            />
          )}
          <FormTextField
            name="password"
            testID="new-password-input"
            label="New password"
            placeholder="At least 8 characters"
            secureTextEntry
            autoComplete="new-password"
          />
          <FormTextField
            name="confirm"
            testID="confirm-password-input"
            label="Confirm new password"
            placeholder="Re-enter password"
            secureTextEntry
            autoComplete="new-password"
            returnKeyType="done"
            onSubmitEditing={() => formik.handleSubmit()}
          />
          <FormError message={formik.status?.form} />
          <Button
            testID="reset-button"
            title="Reset password"
            loading={formik.isSubmitting}
            onPress={() => formik.handleSubmit()}
          />
          <AuthLink
            label="Request a new link"
            onPress={() => router.replace("/(auth)/forgot-password")}
          />
        </FormikProvider>
      )}
    </AuthScreen>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    success: {
      backgroundColor: c.successSoft,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
    },
    successTitle: {
      color: c.successText,
      fontSize: 16,
      fontWeight: "800",
      marginBottom: 4,
    },
    successBody: { color: c.successText, marginBottom: 8 },
  });
