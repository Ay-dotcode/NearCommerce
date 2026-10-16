import {
  filterCommands,
  stepIndex,
  type PaletteCommand,
} from "@/helpers/commands";
import { cn } from "@nearcommerce/helpers";
import { OverlayBackdrop } from "@nearcommerce/ui";
import { useDialogBehavior } from "@nearcommerce/ui/src/hooks/useDialogBehavior";
import { useEffect, useId, useRef, useState } from "react";

// Quick launcher for the admin console (Ctrl+K / Cmd+K): jump to any page or run an action
// by typing a few letters. Arrow keys move, Enter runs, Escape closes.
export function CommandPalette({
  open,
  onClose,
  commands,
}: {
  open: boolean;
  onClose: () => void;
  commands: PaletteCommand[];
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  useDialogBehavior(open, true, onClose, panelRef);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActive(0);
    }
  }, [open]);

  if (!open) return null;

  const results = filterCommands(commands, query);
  const run = (command: PaletteCommand | undefined) => {
    if (!command) return;
    onClose();
    command.run();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) =>
        stepIndex(i, e.key === "ArrowDown" ? 1 : -1, results.length),
      );
    } else if (e.key === "Enter") {
      e.preventDefault();
      run(results[active]);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[15vh]">
      <OverlayBackdrop onClick={onClose} testId="palette-backdrop" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        tabIndex={-1}
        className="relative w-full max-w-lg animate-sheet-in overflow-hidden rounded-xl border border-slate-200 bg-white shadow-overlay motion-reduce:animate-none"
      >
        <input
          data-autofocus
          role="combobox"
          aria-expanded="true"
          aria-controls={listId}
          aria-activedescendant={
            results[active] ? `${listId}-${results[active].id}` : undefined
          }
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
          }}
          onKeyDown={onKeyDown}
          placeholder="Type a page or an action…"
          className="w-full border-b border-slate-200 bg-transparent px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
        />
        <ul
          id={listId}
          role="listbox"
          className="max-h-72 overflow-y-auto p-1.5"
        >
          {results.length === 0 && (
            <li className="px-3 py-6 text-center text-sm text-slate-500">
              Nothing matches “{query}”.
            </li>
          )}
          {results.map((command, index) => (
            <li
              key={command.id}
              id={`${listId}-${command.id}`}
              role="option"
              aria-selected={index === active}
              onMouseMove={() => setActive(index)}
              onClick={() => run(command)}
              className={cn(
                "flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors",
                index === active
                  ? "bg-brand-50 text-brand-800 shadow-glow"
                  : "text-slate-700",
              )}
            >
              <span>{command.label}</span>
              <span className="text-xs text-slate-400">{command.group}</span>
            </li>
          ))}
        </ul>
        <p className="border-t border-slate-200 bg-slate-50 px-4 py-2 text-xs text-slate-500">
          ↑ ↓ to move · Enter to open · Esc to close
        </p>
      </div>
    </div>
  );
}
