import {
  THEME_LABELS,
  THEME_PREFERENCES,
  cn,
  type ThemePreference,
} from "@nearcommerce/helpers";
import { useThemePreference } from "@nearcommerce/ui/src/hooks/useThemePreference";
import type { ReactNode } from "react";

const icons: Record<ThemePreference, ReactNode> = {
  system: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="4" width="18" height="12" rx="2" />
      <path d="M8 20h8M12 16v4" />
    </svg>
  ),
  light: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  ),
  dark: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
    </svg>
  ),
};

// Three-way theme switch: Auto (follow the device), Light, Dark. The choice is saved, so it is
// still there after a refresh. `compact` shows icons only (the labels stay for screen readers).
export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { preference, setPreference } = useThemePreference();

  return (
    <div
      role="radiogroup"
      aria-label="Theme"
      className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 shadow-card"
    >
      {THEME_PREFERENCES.map((option) => {
        const active = preference === option;
        return (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={active}
            title={`${THEME_LABELS[option]} theme`}
            onClick={() => setPreference(option)}
            className={cn(
              "press hover-outline inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500",
              active
                ? "bg-brand-600 text-onbrand shadow-glow"
                : "text-slate-600 hover:bg-slate-100",
            )}
          >
            {icons[option]}
            <span className={compact ? "sr-only" : undefined}>
              {THEME_LABELS[option]}
            </span>
          </button>
        );
      })}
    </div>
  );
}
