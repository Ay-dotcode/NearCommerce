import * as React from "react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = "", variant = "primary", ...props }, ref) => {
    const variantStyles = {
      primary:
        "border-slate-600 hover:border-cyan-400 hover:text-cyan-300 text-slate-100",
      secondary:
        "border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700",
      danger:
        "border-red-600 bg-red-600/10 text-red-400 hover:bg-red-600/20 hover:border-red-500",
    }[variant];

    return (
      <button
        ref={ref}
        className={`rounded border px-3 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${variantStyles} ${className}`}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";
