import type { ReasonValues } from "@/forms/reason.form";
import { BusyFieldset, FormTextAreaField } from "@nearcommerce/ui";
import { FormikProvider, type FormikProps } from "formik";

interface Props {
  formik: FormikProps<ReasonValues>;
  // Lets a submit button outside the form (in a dialog footer) trigger it.
  formId: string;
  hint?: string;
}

// The reason field. The dialog around it owns the buttons.
export function ReasonForm({ formik, formId, hint }: Props) {
  return (
    <FormikProvider value={formik}>
      <form id={formId} onSubmit={formik.handleSubmit} noValidate>
        <BusyFieldset busy={formik.isSubmitting} className="space-y-4">
          <FormTextAreaField
            name="reason"
            label="Reason"
            rows={3}
            data-autofocus
            hint={hint}
            error={formik.errors.reason}
          />
        </BusyFieldset>
      </form>
    </FormikProvider>
  );
}
