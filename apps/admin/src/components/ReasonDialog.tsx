import { ReasonForm } from "@/forms/ReasonForm";
import { useReasonForm } from "@/forms/useReasonForm";
import { Button, Modal } from "@nearcommerce/ui";
import { useId } from "react";

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

// Asks for the written reason every moderation action needs and runs the action once it is
// given. Used for suspend, demote and every delete. The form itself lives in forms/.
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
  const { formik, busy, valid } = useReasonForm(open, onConfirm);

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
      <ReasonForm formik={formik} formId={formId} hint={hint} />
    </Modal>
  );
}
