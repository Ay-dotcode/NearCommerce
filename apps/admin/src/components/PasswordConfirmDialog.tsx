import { usePasswordConfirmForm } from "@/forms/usePasswordConfirmForm";
import {
  BusyFieldset,
  Button,
  FormTextAreaField,
  Modal,
  PasswordField,
} from "@nearcommerce/ui";
import { FormikProvider } from "formik";
import { useId } from "react";

interface PasswordConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  busyLabel?: string;
  tone?: "danger" | "primary";
  hint?: string;
  askReason?: boolean;
  reasonHint?: string;
  onClose: () => void;
  onConfirm: (password: string, reason?: string) => Promise<unknown>;
}

export function PasswordConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  busyLabel = "Working…",
  tone = "primary",
  hint = "This confirms it is really you. It is not stored or shown to anyone.",
  askReason = false,
  reasonHint = "Recorded in the audit log.",
  onClose,
  onConfirm,
}: PasswordConfirmDialogProps) {
  const formId = useId();
  const { formik, busy, valid } = usePasswordConfirmForm(open, onConfirm);

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
        <form id={formId} onSubmit={formik.handleSubmit} noValidate>
          <BusyFieldset busy={busy} className="space-y-4">
            <PasswordField
              label="Your password"
              autoComplete="current-password"
              data-autofocus
              hint={hint}
              {...formik.getFieldProps("password")}
              error={formik.errors.password}
            />
            {askReason && (
              <FormTextAreaField
                name="reason"
                label="Reason (optional)"
                rows={3}
                hint={reasonHint}
                error={formik.errors.reason}
              />
            )}
          </BusyFieldset>
        </form>
      </FormikProvider>
    </Modal>
  );
}
