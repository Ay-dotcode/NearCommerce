import { MIN_REASON_LENGTH } from "@/constants";
import { parseApiError } from "@nearcommerce/api";
import { Button, FormTextAreaField, Modal } from "@nearcommerce/ui";
import { FormikProvider, useFormik } from "formik";
import { useEffect, useId } from "react";

interface ReasonDialogProps {
  open: boolean;
  title: string;
  // Plain-language impact of the action.
  description: string;
  confirmLabel: string;
  busyLabel?: string;
  tone?: "danger" | "primary";
  hint?: string;
  onClose: () => void;
  // Throw to keep the dialog open and show the server's message.
  onConfirm: (reason: string) => Promise<unknown>;
}

// Asks for the written reason every moderation action needs (the API rejects anything under
// 5 characters) and runs the action once it is given. Used for suspend, demote and every delete.
export function ReasonDialog({
  open,
  title,
  description,
  confirmLabel,
  busyLabel = "Working…",
  tone = "danger",
  hint = "Recorded in the audit log.",
  onClose,
  onConfirm,
}: ReasonDialogProps) {
  const formId = useId();
  const formik = useFormik({
    initialValues: { reason: "" },
    validate: ({ reason }) =>
      reason.trim().length >= MIN_REASON_LENGTH
        ? {}
        : {
            reason: `Give a reason of at least ${MIN_REASON_LENGTH} characters.`,
          },
    validateOnChange: false,
    onSubmit: async ({ reason }, helpers) => {
      try {
        await onConfirm(reason.trim());
      } catch (err) {
        helpers.setFieldError(
          "reason",
          parseApiError(err, "That didn't work. Please try again.").message,
        );
      }
    },
  });

  const { resetForm } = formik;
  useEffect(() => {
    if (open) resetForm();
  }, [open, resetForm]);

  const busy = formik.isSubmitting;
  const valid = formik.values.reason.trim().length >= MIN_REASON_LENGTH;

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
          <Button
            type="submit"
            form={formId}
            variant={tone}
            disabled={!valid}
            loading={busy}
          >
            {busy ? busyLabel : confirmLabel}
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
          <FormTextAreaField
            name="reason"
            label="Reason"
            rows={3}
            data-autofocus
            hint={hint}
            error={formik.errors.reason}
          />
        </form>
      </FormikProvider>
    </Modal>
  );
}
