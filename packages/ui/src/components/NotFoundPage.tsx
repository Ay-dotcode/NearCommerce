import { ReactNode } from "react";

// The standard "404 page not found" screen. `action` is usually a link back to the main page
// (the app passes its own router link so this package stays router-agnostic).
export function NotFoundPage({
  action,
  title = "Page not found",
  description = "The page you are looking for does not exist or has been moved.",
}: {
  action?: ReactNode;
  title?: string;
  description?: string;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
      <div className="max-w-md text-center">
        <p className="text-sm font-semibold text-brand-600">404</p>
        <h1 className="mt-1 text-2xl font-semibold text-slate-900">{title}</h1>
        <p className="mt-2 text-sm text-slate-600">{description}</p>
        {action && <div className="mt-6 flex justify-center">{action}</div>}
      </div>
    </main>
  );
}
