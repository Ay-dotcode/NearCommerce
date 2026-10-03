import { useEffect, useState } from "react";
import { Button } from "./Button";
import { TextField } from "./Field";
import { Modal } from "./Modal";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
  // When set, the user must type this exact text before the confirm button enables.
  requireText?: string;
  tone?: "danger" | "primary";
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  onConfirm,
  onCancel,
  loading = false,
  requireText,
  tone = "danger",
}: ConfirmDialogProps) {
  const [typed, setTyped] = useState("");
  useEffect(() => {
    if (!open) setTyped("");
  }, [open]);

  const canConfirm = !requireText || typed === requireText;

  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      description={description}
      size="sm"
      dismissible={!loading}
      footer={
        <>
          <Button variant="secondary" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant={tone === "danger" ? "danger" : "primary"}
            onClick={onConfirm}
            disabled={!canConfirm}
            loading={loading}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      {requireText ? (
        <TextField
          label={`Type "${requireText}" to confirm`}
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          autoComplete="off"
          data-autofocus
        />
      ) : null}
    </Modal>
  );
}
