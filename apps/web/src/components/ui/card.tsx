import { HTMLAttributes, forwardRef } from "react";

export const Card = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className = "", ...props }, ref) => (
    <div
      ref={ref}
      className={`rounded-lg border border-slate-800 bg-slate-900 ${className}`}
      {...props}
    />
  ),
);
Card.displayName = "Card";

export const CardHeader = ({
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement>) => (
  <div className={`p-5 ${className}`} {...props} />
);

export const CardTitle = ({
  className = "",
  ...props
}: HTMLAttributes<HTMLHeadingElement>) => (
  <h2 className={`font-semibold ${className}`} {...props} />
);

export const CardContent = ({
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement>) => (
  <div className={`px-5 pb-5 ${className}`} {...props} />
);
