import { usePasswordConfirmForm } from "@/forms/usePasswordConfirmForm";
import { BusyFieldset, Button, Modal, PasswordField } from "@nearcommerce/ui";
import { useId } from "react";

interface PasswordConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  busyLabel?: string;
  tone?: "danger" | "primary";
  hint?: string;
  onClose: () => void;
  onConfirm: (password: string) => Promise<unknown>;
}

// Asks the signed-in admin for their own password before a sensitive action, such as making
// another user an admin, and runs the action once it is given.
export function PasswordConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  busyLabel = "Working…",
  tone = "primary",
  hint = "This confirms it is really you. It is not stored or shown to anyone.",
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
        </BusyFieldset>
      </form>
    </Modal>
  );
}
