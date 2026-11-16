import { Button } from "./Button";

// Shown instead of a blank screen when something unexpected breaks. Used by ErrorBoundary and
// as a router `errorElement` (for example when a page chunk fails to load after a deploy).
export function ErrorFallback({
  title = "Something went wrong",
  description = "An unexpected error occurred. Try again, or reload the page if the problem continues.",
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  return (
    <div
      role="alert"
      className="flex min-h-screen items-center justify-center bg-slate-50 px-6"
    >
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
        <p className="mt-2 text-sm text-slate-600">{description}</p>
        <div className="mt-6 flex justify-center gap-2">
          {onRetry && <Button onClick={onRetry}>Try again</Button>}
          <Button
            variant={onRetry ? "secondary" : "primary"}
            onClick={() => window.location.reload()}
          >
            Reload page
          </Button>
        </div>
      </div>
    </div>
  );
}
