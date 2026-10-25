import type { NameValues } from "@/forms/name.form";
import { BusyFieldset, FormTextField } from "@nearcommerce/ui";
import { FormikProvider, type FormikProps } from "formik";

interface Props {
  formik: FormikProps<NameValues>;
  formId: string;
}

// The single name field. The dialog around it owns the buttons.
export function NameForm({ formik, formId }: Props) {
  return (
    <FormikProvider value={formik}>
      <form id={formId} onSubmit={formik.handleSubmit} noValidate>
        <BusyFieldset busy={formik.isSubmitting} className="space-y-4">
          <FormTextField
            name="name"
            label="Name"
            data-autofocus
            autoComplete="off"
            error={formik.errors.name}
          />
        </BusyFieldset>
      </form>
    </FormikProvider>
  );
}
