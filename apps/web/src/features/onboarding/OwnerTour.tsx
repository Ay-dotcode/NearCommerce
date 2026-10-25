import { useDialogBehavior } from "@nearcommerce/ui";
import { cn } from "@nearcommerce/helpers";
import { KeyboardEvent, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { OWNER_TOUR_STEPS as STEPS } from "./tourSteps";

interface Props {
  open: boolean;
  // Called when the tour is finished or skipped.
  onClose: () => void;
}

const Check = () => (
  <svg
    aria-hidden="true"
    viewBox="0 0 20 20"
    className="mt-0.5 h-5 w-5 shrink-0 text-brand-600"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="10" cy="10" r="8.5" className="fill-brand-100 stroke-none" />
    <path d="M6.5 10.3l2.3 2.3 4.7-5" />
  </svg>
);

// A guided, step-by-step introduction for new store owners: an animated picture, a plain
// explanation and a few concrete tips per step. Arrow keys move between steps, Escape skips.
export function OwnerTour({ open, onClose }: Props) {
  const [index, setIndex] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const bodyId = useId();
  useDialogBehavior(open, true, onClose, panelRef);

  // Every time the tour opens it starts from the beginning.
  useEffect(() => {
    if (open) setIndex(0);
  }, [open]);

  if (!open) return null;

  const step = STEPS[index];
  const last = index === STEPS.length - 1;
  const go = (next: number) =>
    setIndex(Math.min(STEPS.length - 1, Math.max(0, next)));

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === "ArrowRight") go(index + 1);
    else if (e.key === "ArrowLeft") go(index - 1);
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div
        aria-hidden="true"
        className="absolute inset-0 animate-overlay-in bg-scrim/50 backdrop-blur-sm motion-reduce:animate-none"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={bodyId}
        tabIndex={-1}
        onKeyDown={onKeyDown}
        className="relative flex max-h-[94vh] w-full max-w-4xl animate-sheet-in flex-col overflow-hidden rounded-t-2xl border border-slate-200 bg-white shadow-overlay focus:outline-none motion-reduce:animate-none sm:rounded-2xl md:max-h-[88vh]"
      >
        <div className="flex items-center justify-between px-5 pt-4 md:absolute md:inset-x-0 md:top-0 md:z-10 md:px-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-700 md:rounded-full md:bg-white/80 md:px-3 md:py-1">
            Step {index + 1} of {STEPS.length}
          </p>
          {!last && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-md px-2 py-1 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 md:bg-white/80"
            >
              Skip tour
            </button>
          )}
        </div>

        <div className="grid min-h-0 flex-1 overflow-y-auto md:grid-cols-5">
          <div
            key={`scene-${step.id}`}
            className="flex animate-pop-in items-center justify-center bg-gradient-to-br from-brand-50 via-white to-brand-100 px-6 py-6 motion-reduce:animate-none md:col-span-2 md:min-h-[26rem] md:px-8"
          >
            <div className="h-44 w-full max-w-xs md:h-60">{step.scene}</div>
          </div>

          <div
            key={`text-${step.id}`}
            aria-live="polite"
            className="animate-fade-in-up p-5 motion-reduce:animate-none md:col-span-3 md:flex md:flex-col md:justify-center md:p-10"
          >
            <h2
              id={titleId}
              className="text-2xl font-semibold tracking-tight text-slate-900"
            >
              {step.title}
            </h2>
            <p
              id={bodyId}
              className="mt-2 text-base leading-relaxed text-slate-600"
            >
              {step.body}
            </p>
            <ul className="mt-5 space-y-2.5">
              {step.tips.map((tip) => (
                <li key={tip} className="flex gap-2.5 text-sm text-slate-700">
                  <Check />
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-slate-200 bg-white px-5 py-4 md:px-8">
          <div
            role="group"
            aria-label="Tour progress"
            className="flex items-center gap-1.5"
          >
            {STEPS.map((s, i) => (
              <button
                key={s.id}
                type="button"
                onClick={() => go(i)}
                aria-label={`Go to step ${i + 1}: ${s.title}`}
                aria-current={i === index ? "step" : undefined}
                className="group flex h-6 w-4 items-center justify-center focus:outline-none"
              >
                <span
                  className={cn(
                    "block h-2 rounded-full transition-all duration-300 group-focus-visible:ring-2 group-focus-visible:ring-brand-500 group-focus-visible:ring-offset-2",
                    i === index
                      ? "w-6 bg-brand-600"
                      : i < index
                        ? "w-2 bg-brand-300"
                        : "w-2 bg-slate-300 group-hover:bg-slate-400",
                  )}
                />
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            {index > 0 && (
              <button
                type="button"
                onClick={() => go(index - 1)}
                className="h-10 rounded-md border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 shadow-card hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
              >
                Back
              </button>
            )}
            <button
              type="button"
              data-autofocus
              onClick={() => (last ? onClose() : go(index + 1))}
              className="press h-10 rounded-md bg-brand-600 px-5 text-sm font-semibold text-onbrand shadow-card hover:bg-brand-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
            >
              {last ? "Let's go" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
