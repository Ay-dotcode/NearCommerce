import { ReactNode, useId, useRef } from "react";
import { useDialogBehavior } from "@nearcommerce/ui/src/hooks/useDialogBehavior";
import { cn } from "@nearcommerce/helpers";
import { OverlayBackdrop } from "./Modal";

export interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  side?: "left" | "right";
}

// Side drawer with the same blurred backdrop, focus handling and Escape behaviour as Modal.
export function Drawer({
  open,
  onClose,
  title,
  children,
  side = "left",
}: DrawerProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  useDialogBehavior(open, true, onClose, panelRef);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <OverlayBackdrop onClick={onClose} testId="drawer-backdrop" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cn(
          "absolute inset-y-0 flex w-72 max-w-[85vw] animate-drawer-in flex-col border-slate-200 bg-white shadow-overlay focus:outline-none motion-reduce:animate-none",
          side === "left" ? "left-0 border-r" : "right-0 border-l",
        )}
      >
        <header className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h2 id={titleId} className="text-base font-semibold text-slate-900">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="rounded-md p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            <span aria-hidden="true">✕</span>
          </button>
        </header>
        <div className="flex-1 overflow-y-auto p-2">{children}</div>
      </div>
    </div>
  );
}
