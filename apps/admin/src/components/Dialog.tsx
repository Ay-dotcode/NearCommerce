import { ReactNode, useEffect, useId, useRef } from "react";

const FOCUSABLE =
  'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  /** Set false while a request is in flight so Escape / backdrop can't dismiss it. */
  dismissible?: boolean;
}

// Accessible modal for the admin console: role="dialog", labelled, Escape closes, focus moves in
// and is trapped, and returns to the trigger on close. Put `data-autofocus` on the first field.
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  dismissible = true,
}: DialogProps) {
  const titleId = useId();
  const descId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    const first =
      panel?.querySelector<HTMLElement>("[data-autofocus]") ??
      panel?.querySelector<HTMLElement>(FOCUSABLE) ??
      panel;
    first?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && dismissible) {
        e.stopPropagation();
        return onCloseRef.current();
      }
      if (e.key !== "Tab" || !panel) return;
      const items = [...panel.querySelectorAll<HTMLElement>(FOCUSABLE)];
      if (items.length === 0) return e.preventDefault();
      const firstEl = items[0];
      const lastEl = items[items.length - 1];
      if (e.shiftKey && document.activeElement === firstEl) {
        e.preventDefault();
        lastEl.focus();
      } else if (!e.shiftKey && document.activeElement === lastEl) {
        e.preventDefault();
        firstEl.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previouslyFocused?.focus?.();
    };
  }, [open, dismissible]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div
        className="absolute inset-0 bg-black/70"
        aria-hidden="true"
        data-testid="dialog-backdrop"
        onClick={dismissible ? onClose : undefined}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
        className="relative flex max-h-[92vh] w-full max-w-lg flex-col rounded-t-xl border border-slate-700 bg-slate-900 shadow-2xl focus:outline-none sm:rounded-xl"
      >
        <header className="border-b border-slate-800 px-5 py-4">
          <h2 id={titleId} className="text-lg font-semibold text-slate-100">
            {title}
          </h2>
          {description && (
            <p id={descId} className="mt-1 text-sm text-slate-400">
              {description}
            </p>
          )}
        </header>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
        {footer && (
          <footer className="flex flex-col-reverse gap-2 border-t border-slate-800 px-5 py-3 sm:flex-row sm:justify-end">
            {footer}
          </footer>
        )}
      </div>
    </div>
  );
}

export function FormField({
  label,
  error,
  hint,
  id,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  id: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1 block text-sm font-medium text-slate-300"
      >
        {label}
      </label>
      {children}
      {error ? (
        <p
          id={`${id}-error`}
          role="alert"
          className="mt-1 text-sm text-red-400"
        >
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-1 text-sm text-slate-500">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export const inputClass = (invalid: boolean) =>
  `block w-full rounded border bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 ${
    invalid
      ? "border-red-500 focus:ring-red-500/40"
      : "border-slate-700 focus:border-cyan-400 focus:ring-cyan-400/30"
  }`;
