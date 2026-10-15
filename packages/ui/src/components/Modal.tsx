import { ReactNode, useId, useRef } from "react";
import { useDialogBehavior } from "@nearcommerce/ui/src/hooks/useDialogBehavior";
import { cn } from "@nearcommerce/helpers";

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  // Disable Escape / backdrop dismissal while a request is in flight.
  dismissible?: boolean;
}

const widths = {
  sm: "max-w-md",
  md: "max-w-xl",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
} as const;

// Blurred, dimmed backdrop shared by every overlay in the web and admin apps.
export function OverlayBackdrop({
  onClick,
  testId = "modal-backdrop",
}: {
  onClick?: () => void;
  testId?: string;
}) {
  return (
    <div
      className="absolute inset-0 animate-overlay-in bg-scrim/40 backdrop-blur-sm motion-reduce:animate-none"
      aria-hidden="true"
      data-testid={testId}
      onClick={onClick}
    />
  );
}

// Accessible modal dialog (bottom sheet on small screens): role="dialog", labelled, Escape
// closes, focus is trapped, and the page behind is blurred and scroll-locked while open.
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
  dismissible = true,
}: ModalProps) {
  const titleId = useId();
  const descId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  useDialogBehavior(open, dismissible, onClose, panelRef);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <OverlayBackdrop onClick={dismissible ? onClose : undefined} />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
        className={cn(
          "relative flex max-h-[92vh] w-full animate-sheet-in flex-col rounded-t-xl border border-slate-200 bg-white shadow-overlay focus:outline-none motion-reduce:animate-none sm:rounded-xl",
          widths[size],
        )}
      >
        <header className="border-b border-slate-200 px-5 py-4">
          <h2 id={titleId} className="text-base font-semibold text-slate-900">
            {title}
          </h2>
          {description && (
            <p id={descId} className="mt-1 text-sm text-slate-600">
              {description}
            </p>
          )}
        </header>
        <div className="overflow-y-auto px-5 py-4 text-slate-900">
          {children}
        </div>
        {footer && (
          <footer className="flex flex-col-reverse gap-2 border-t border-slate-200 bg-slate-50 px-5 py-3 sm:flex-row sm:justify-end sm:rounded-b-xl">
            {footer}
          </footer>
        )}
      </div>
    </div>
  );
}
