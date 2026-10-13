import { CreateSubcategorySchema, parseApiError } from "@nearcommerce/api";
import { Button, FormTextField, Modal } from "@nearcommerce/ui";
import { FormikProvider, useFormik } from "formik";
import { useEffect, useId } from "react";

interface Props {
  open: boolean;
  title: string;
  description?: string;
  initialName?: string;
  submitLabel: string;
  onClose: () => void;
  onSubmit: (name: string) => Promise<void>;
}

export function NameFormDialog({
  open,
  title,
  description,
  initialName = "",
  submitLabel,
  onClose,
  onSubmit,
}: Props) {
  const formId = useId();
  const formik = useFormik({
    initialValues: { name: initialName },
    validate: (values) => {
      const parsed = CreateSubcategorySchema.safeParse(values);
      return parsed.success ? {} : { name: parsed.error.issues[0].message };
    },
    validateOnChange: false,
    onSubmit: async (values, helpers) => {
      const name = CreateSubcategorySchema.parse(values).name;
      try {
        await onSubmit(name);
      } catch (err) {
        const parsed = parseApiError(
          err,
          "We couldn't save that. Please try again.",
        );
        helpers.setFieldError(
          "name",
          parsed.details.find((d) => d.path === "name")?.message ??
            parsed.message,
        );
      }
    },
  });

  const { resetForm } = formik;
  useEffect(() => {
    if (open) resetForm({ values: { name: initialName } });
  }, [open, initialName, resetForm]);

  const busy = formik.isSubmitting;

  return (
    <Modal
      open={open}
      onClose={onClose}
      dismissible={!busy}
      title={title}
      description={description}
      size="sm"
      footer={
        <>
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={busy}
          >
            Cancel
          </Button>
          <Button type="submit" form={formId} loading={busy}>
            {submitLabel}
          </Button>
        </>
      }
    >
      <FormikProvider value={formik}>
        <form
          id={formId}
          onSubmit={formik.handleSubmit}
          noValidate
          className="space-y-4"
        >
          <FormTextField
            name="name"
            label="Name"
            data-autofocus
            autoComplete="off"
            error={formik.errors.name}
          />
        </form>
      </FormikProvider>
    </Modal>
  );
}
