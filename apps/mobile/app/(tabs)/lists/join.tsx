import { apiErrorMessage } from "@/api/errors";
import { Button, FormError, FormTextField } from "@/components/ui";
import { useThemedStyles, type ThemeColors } from "@/theme";
import { SCREEN_EDGES } from "@/theme/layout";
import { apiClient } from "@nearcommerce/api";
import { useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { FormikProvider, useFormik } from "formik";
import { StyleSheet, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Yup from "yup";

const schema = Yup.object({
  code: Yup.string()
    .trim()
    .min(4, "Enter the full invite code.")
    .required("Enter the invite code."),
});

export default function JoinListScreen() {
  const styles = useThemedStyles(makeStyles);
  const queryClient = useQueryClient();

  const formik = useFormik({
    initialValues: { code: "" },
    validationSchema: schema,
    validateOnChange: false,
    onSubmit: async ({ code }, helpers) => {
      helpers.setStatus(undefined);
      try {
        await apiClient.post("/lists/join", { invite_code: code.trim() });
        queryClient.invalidateQueries({ queryKey: ["lists"] });
        router.back();
      } catch (err) {
        // Shown in the form (not a pop-up): the code field turns red with the reason.
        helpers.setStatus({
          form: apiErrorMessage(err, "Invalid or expired invite code."),
        });
      }
    },
  });

  return (
    <SafeAreaView style={styles.container} edges={SCREEN_EDGES}>
      <Text style={styles.title}>Join a Household List</Text>
      <FormikProvider value={formik}>
        <FormTextField
          name="code"
          testID="invite-code-input"
          placeholder="Enter Invite Code"
          accessibilityLabel="Invite code"
          autoCapitalize="characters"
          returnKeyType="done"
          onSubmitEditing={() => formik.handleSubmit()}
          invalid={Boolean(formik.status?.form)}
        />
        <FormError message={formik.status?.form} />
        <Button
          title="Join List"
          loading={formik.isSubmitting}
          onPress={() => formik.handleSubmit()}
        />
      </FormikProvider>
    </SafeAreaView>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      padding: 20,
      justifyContent: "center",
      backgroundColor: c.background,
    },
    title: {
      color: c.text,
      fontSize: 24,
      fontWeight: "bold",
      marginBottom: 20,
      textAlign: "center",
    },
  });
