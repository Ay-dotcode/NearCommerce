import { ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@nearcommerce/helpers";
import { Spinner } from "./Spinner";

export type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";
export type ButtonSize = "sm" | "md";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

const variants: Record<ButtonVariant, string> = {
  primary:
    "press bg-brand-600 text-onbrand shadow-card hover:bg-brand-700 hover:shadow-glow focus-visible:ring-brand-500",
  secondary:
    "press hover-outline border border-slate-300 bg-white text-slate-700 shadow-card hover:bg-slate-50 focus-visible:ring-brand-500",
  danger:
    "press bg-red-600 text-onbrand shadow-card hover:bg-red-700 hover:shadow-[0_0_24px_-4px_rgb(239_68_68/0.55)] focus-visible:ring-red-500",
  ghost: "press hover-outline text-slate-600 hover:bg-slate-100 focus-visible:ring-brand-500",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-sm",
  md: "h-10 px-4 text-sm",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      loading = false,
      disabled,
      className,
      children,
      type = "button",
      ...rest
    },
    ref,
  ) => (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
        "disabled:cursor-not-allowed disabled:opacity-60",
        variants[variant],
        sizes[size],
        className,
      )}
      {...rest}
    >
      {loading && <Spinner />}
      {children}
    </button>
  ),
);
Button.displayName = "Button";
