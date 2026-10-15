import { cn } from "@nearcommerce/helpers";
import type { ReactNode } from "react";

// Shared by every field component (text, textarea, select).
export const controlClass = (invalid: boolean) =>
  cn(
    "block w-full rounded-md border bg-white px-3 py-2 text-sm text-slate-900 shadow-card",
    "placeholder:text-slate-400 focus:outline-none focus:shadow-glow focus:ring-2 focus:ring-offset-0",
    "disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500",
    invalid
      ? "border-red-400 focus:border-red-500 focus:ring-red-200"
      : "border-slate-300 focus:border-brand-500 focus:ring-brand-200",
  );

export const describedBy = (id: string, error?: string, hint?: ReactNode) =>
  error ? `${id}-error` : hint ? `${id}-hint` : undefined;
