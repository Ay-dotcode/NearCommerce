import { Dialog, FormField, inputClass } from "@/components/Dialog";
import { MIN_REASON_LENGTH } from "@/constants";
import { parseApiError } from "@nearcommerce/api";
import { Button } from "@nearcommerce/ui";
import { FormEvent, useEffect, useId, useState } from "react";

interface ReasonDialogProps {
  open: boolean;
  title: string;
  // Plain-language impact of the action.
  description: string;
  confirmLabel: string;
  busyLabel?: string;
  tone?: "danger" | "primary";
  onClose: () => void;
  // Throw to keep the dialog open and show the server's message.
  onConfirm: (reason: string) => Promise<unknown>;
}

// Asks for the written reason every moderation action needs (the API rejects
// anything under 5 characters) and runs the action once it is given.
export function ReasonDialog({
  open,
  title,
  description,
  confirmLabel,
  busyLabel = "Working…",
  tone = "danger",
  onClose,
  onConfirm,
}: ReasonDialogProps) {
  const formId = useId();
  const fieldId = `${formId}-reason`;
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setReason("");
      setError(null);
    }
  }, [open]);

  const trimmed = reason.trim();
  const valid = trimmed.length >= MIN_REASON_LENGTH;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!valid)
      return setError(
        `Give a reason of at least ${MIN_REASON_LENGTH} characters.`,
      );
    setBusy(true);
    setError(null);
    try {
      await onConfirm(trimmed);
    } catch (err) {
      setError(
        parseApiError(err, "That didn't work. Please try again.").message,
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      dismissible={!busy}
      title={title}
      description={description}
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
            disabled={busy || !valid}
          >
            {busy ? busyLabel : confirmLabel}
          </Button>
        </>
      }
    >
      <form
        id={formId}
        onSubmit={handleSubmit}
        noValidate
        className="space-y-4"
      >
        <FormField
          id={fieldId}
          label="Reason"
          hint="Recorded in the audit log."
          error={error ?? undefined}
        >
          <textarea
            id={fieldId}
            data-autofocus
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            aria-invalid={Boolean(error) || undefined}
            className={inputClass(Boolean(error))}
          />
        </FormField>
      </form>
    </Dialog>
  );
}
