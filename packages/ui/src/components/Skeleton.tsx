import { HTMLAttributes } from "react";
import { cn } from "@nearcommerce/helpers";

// A grey placeholder block with a moving highlight (the "YouTube" loading style). Give it the
// same width/height/radius as the real element it stands in for so the page does not jump
// when the data arrives.
export function Skeleton({
  className,
  ...rest
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "relative overflow-hidden rounded-md bg-slate-200",
        "before:absolute before:inset-0 before:-translate-x-full before:animate-skeleton-shimmer",
        "before:bg-gradient-to-r before:from-transparent before:via-shimmer/50 before:to-transparent",
        "motion-reduce:before:animate-none",
        className,
      )}
      {...rest}
    />
  );
}

// Wraps a group of skeleton blocks so assistive tech announces a single busy region.
export function SkeletonGroup({
  label = "Content is loading",
  className,
  children,
}: {
  label?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label={label}
      data-testid="skeleton"
      className={className}
    >
      {children}
    </div>
  );
}
