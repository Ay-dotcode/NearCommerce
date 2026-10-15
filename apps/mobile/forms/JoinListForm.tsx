import { apiErrorMessage } from "@/api/errors";
import { Button, FormError, FormTextField } from "@/components/ui";
import { joinListInitialValues, joinListSchema } from "@/forms/joinList.form";
import { apiClient } from "@nearcommerce/api";
import { useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { FormikProvider, useFormik } from "formik";

// Enter an invite code to join a shared household list.
export function JoinListForm() {
  const queryClient = useQueryClient();

  const formik = useFormik({
    initialValues: joinListInitialValues,
    validationSchema: joinListSchema,
    validateOnChange: false,
    onSubmit: async ({ code }, helpers) => {
      helpers.setStatus(undefined);
      try {
        await apiClient.post("/lists/join", { invite_code: code.trim() });
        queryClient.invalidateQueries({ queryKey: ["lists"] });
        router.back();
      } catch (err) {
        helpers.setStatus({
          form: apiErrorMessage(err, "Invalid or expired invite code."),
        });
      }
    },
  });

  return (
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
  );
}
