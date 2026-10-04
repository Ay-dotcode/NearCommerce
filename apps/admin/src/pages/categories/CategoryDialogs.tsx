import { parseApiError } from "@/api/errors";
import { Dialog, FormField, inputClass } from "@/components/Dialog";
import type { AdminCategory } from "@/types/admin";
import {
  CreateCategorySchema,
  CreateSubcategorySchema,
} from "@nearcommerce/api";
import { Button } from "@nearcommerce/ui";
import { FormEvent, useEffect, useState } from "react";

type FieldErrors = Record<string, string>;

function useServerErrors() {
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const reset = () => {
    setErrors({});
    setFormError(null);
  };
  const fromError = (error: unknown) => {
    const parsed = parseApiError(
      error,
      "We couldn't save that. Please try again.",
    );
    if (parsed.details.length > 0)
      setErrors(
        Object.fromEntries(parsed.details.map((d) => [d.path, d.message])),
      );
    setFormError(parsed.message);
  };
  return { errors, setErrors, formError, reset, fromError };
}

// ---------------------------------------------------------------------------
// Create / edit a category (name + optional icon)
// ---------------------------------------------------------------------------

export function CategoryFormDialog({
  open,
  category,
  onClose,
  onSubmit,
}: {
  open: boolean;
  /** Provide to edit; omit to create. */
  category?: AdminCategory;
  onClose: () => void;
  onSubmit: (values: { name: string; iconUrl: string | null }) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [iconUrl, setIconUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const { errors, setErrors, formError, reset, fromError } = useServerErrors();

  useEffect(() => {
    if (!open) return;
    setName(category?.name ?? "");
    setIconUrl(category?.icon_url ?? "");
    reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, category]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    reset();
    const parsed = CreateCategorySchema.safeParse({
      name,
      iconUrl: iconUrl.trim() === "" ? null : iconUrl,
    });
    if (!parsed.success) {
      const next: FieldErrors = {};
      for (const issue of parsed.error.issues)
        next[issue.path.join(".")] ??= issue.message;
      return setErrors(next);
    }
    setBusy(true);
    try {
      await onSubmit({
        name: parsed.data.name,
        iconUrl: parsed.data.iconUrl ?? null,
      });
    } catch (error) {
      fromError(error);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      dismissible={!busy}
      title={category ? "Edit category" : "Add category"}
      description="Shoppers browse the catalog by category, then subcategory."
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
          <Button type="submit" form="category-form" disabled={busy}>
            {busy ? "Saving…" : category ? "Save changes" : "Add category"}
          </Button>
        </>
      }
    >
      <form
        id="category-form"
        onSubmit={handleSubmit}
        noValidate
        className="space-y-4"
      >
        <FormField id="category-name" label="Name" error={errors.name}>
          <input
            id="category-name"
            data-autofocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            aria-invalid={Boolean(errors.name) || undefined}
            aria-describedby={errors.name ? "category-name-error" : undefined}
            className={inputClass(Boolean(errors.name))}
            autoComplete="off"
          />
        </FormField>
        <FormField
          id="category-icon"
          label="Icon URL (optional)"
          error={errors.iconUrl}
          hint="A public https image shown on the shopper home screen."
        >
          <input
            id="category-icon"
            type="url"
            inputMode="url"
            placeholder="https://"
            value={iconUrl}
            onChange={(e) => setIconUrl(e.target.value)}
            aria-invalid={Boolean(errors.iconUrl) || undefined}
            className={inputClass(Boolean(errors.iconUrl))}
          />
        </FormField>
        {formError && !errors.name && !errors.iconUrl && (
          <p
            role="alert"
            className="rounded border border-red-800 bg-red-950/50 px-3 py-2 text-sm text-red-300"
          >
            {formError}
          </p>
        )}
      </form>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Create / rename a subcategory (name only)
// ---------------------------------------------------------------------------

export function SubcategoryFormDialog({
  open,
  title,
  initialName = "",
  submitLabel,
  onClose,
  onSubmit,
}: {
  open: boolean;
  title: string;
  initialName?: string;
  submitLabel: string;
  onClose: () => void;
  onSubmit: (name: string) => Promise<void>;
}) {
  const [name, setName] = useState(initialName);
  const [busy, setBusy] = useState(false);
  const { errors, setErrors, formError, reset, fromError } = useServerErrors();

  useEffect(() => {
    if (!open) return;
    setName(initialName);
    reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialName]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    reset();
    const parsed = CreateSubcategorySchema.safeParse({ name });
    if (!parsed.success)
      return setErrors({ name: parsed.error.issues[0].message });
    setBusy(true);
    try {
      await onSubmit(parsed.data.name);
    } catch (error) {
      fromError(error);
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
          <Button type="submit" form="subcategory-form" disabled={busy}>
            {busy ? "Saving…" : submitLabel}
          </Button>
        </>
      }
    >
      <form
        id="subcategory-form"
        onSubmit={handleSubmit}
        noValidate
        className="space-y-4"
      >
        <FormField id="subcategory-name" label="Name" error={errors.name}>
          <input
            id="subcategory-name"
            data-autofocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            aria-invalid={Boolean(errors.name) || undefined}
            aria-describedby={
              errors.name ? "subcategory-name-error" : undefined
            }
            className={inputClass(Boolean(errors.name))}
            autoComplete="off"
          />
        </FormField>
        {formError && !errors.name && (
          <p
            role="alert"
            className="rounded border border-red-800 bg-red-950/50 px-3 py-2 text-sm text-red-300"
          >
            {formError}
          </p>
        )}
      </form>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Delete confirmation with a mandatory reason (stored in the audit ledger)
// ---------------------------------------------------------------------------

export const MIN_REASON_LENGTH = 5;

export function DeleteReasonDialog({
  open,
  title,
  consequences,
  confirmLabel,
  onClose,
  onConfirm,
}: {
  open: boolean;
  title: string;
  /** Plain-language impact, for example "12 products will become uncategorised." */
  consequences: string;
  confirmLabel: string;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
}) {
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
        parseApiError(err, "We couldn't delete that. Please try again.")
          .message,
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
      description={consequences}
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
            form="delete-form"
            variant="danger"
            disabled={busy || !valid}
          >
            {busy ? "Deleting…" : confirmLabel}
          </Button>
        </>
      }
    >
      <form
        id="delete-form"
        onSubmit={handleSubmit}
        noValidate
        className="space-y-4"
      >
        <FormField
          id="delete-reason"
          label="Reason"
          hint="Recorded in the audit ledger with a snapshot of what is removed."
          error={error ?? undefined}
        >
          <textarea
            id="delete-reason"
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
