// Tiny inline spinner for buttons that are mid-request. Page-level loading uses Skeleton instead.
export function Spinner({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent motion-reduce:animate-none ${className}`}
    />
  );
}
