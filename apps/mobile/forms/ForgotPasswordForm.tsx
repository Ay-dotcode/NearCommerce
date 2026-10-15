import { apiErrorMessage } from "@/api/errors";
import AuthLink from "@/components/auth/AuthLink";
import { Button, FormError, FormTextField } from "@/components/ui";
import {
  forgotPasswordInitialValues,
  forgotPasswordSchema,
} from "@/forms/forgotPassword.form";
import { useThemedStyles, type ThemeColors } from "@/theme";
import { apiClient } from "@nearcommerce/api";
import { router } from "expo-router";
import { FormikProvider, useFormik } from "formik";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

export function ForgotPasswordForm({
  onSentChange,
}: {
  // Lets the screen change its subtitle once the email has been sent.
  onSentChange?: (sent: boolean) => void;
}) {
  const styles = useThemedStyles(makeStyles);
  const [sent, setSent] = useState(false);

  const formik = useFormik({
    initialValues: forgotPasswordInitialValues,
    validationSchema: forgotPasswordSchema,
    validateOnChange: false,
    onSubmit: async ({ email }, helpers) => {
      helpers.setStatus(undefined);
      try {
        await apiClient.post("/auth/forgot-password", {
          email: email.trim().toLowerCase(),
        });
        setSent(true);
        onSentChange?.(true);
      } catch (err) {
        const status = (err as { response?: { status?: number } })?.response
          ?.status;
        helpers.setStatus({
          form:
            status === 429
              ? "Too many requests. Please wait a few minutes and try again."
              : apiErrorMessage(
                  err,
                  "We couldn't send the reset link. Please try again.",
                ),
        });
      }
    },
  });

  return (
    <>
      {sent ? (
        <View style={styles.success} accessibilityRole="alert">
          <Text style={styles.successTitle}>Check your email</Text>
          <Text style={styles.successBody}>
            If that email is registered, a reset link is on its way. It works
            for one hour.
          </Text>
          <AuthLink
            testID="have-token-link"
            label="I have a reset code"
            align="flex-end"
            onPress={() => router.replace("/(auth)/reset-password")}
          />
        </View>
      ) : (
        <FormikProvider value={formik}>
          <FormTextField
            name="email"
            testID="email-input"
            label="Email"
            placeholder="you@example.com"
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            returnKeyType="send"
            onSubmitEditing={() => formik.handleSubmit()}
          />
          <FormError message={formik.status?.form} />
          <Button
            testID="send-reset-button"
            title="Send reset link"
            loading={formik.isSubmitting}
            onPress={() => formik.handleSubmit()}
          />
        </FormikProvider>
      )}

      <AuthLink
        label="Back to sign in"
        onPress={() => router.replace("/(auth)/login")}
      />
    </>
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
