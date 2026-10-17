import { cn } from "@nearcommerce/helpers";
import { useBackNavigation } from "@nearcommerce/ui/src/hooks/useBackNavigation";

// "← Back" link for any page that is not a main page. Goes to the previous page, or to
// `fallback` when the visitor landed here directly.
export function BackButton({
  fallback,
  label = "Back",
  className,
}: {
  fallback: string;
  label?: string;
  className?: string;
}) {
  const goBack = useBackNavigation(fallback);
  return (
    <button
      type="button"
      onClick={goBack}
      className={cn(
        "press hover-outline -ml-2 inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-sm font-medium text-slate-600 transition-colors hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500",
        className,
      )}
    >
      <svg
        viewBox="0 0 24 24"
        className="h-4 w-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M15 18l-6-6 6-6" />
      </svg>
      {label}
    </button>
  );
}
