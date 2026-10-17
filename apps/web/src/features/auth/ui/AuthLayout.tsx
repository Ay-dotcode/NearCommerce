import { BackButton, BrandIcon, PointerGlow, ThemeToggle } from "@nearcommerce/ui";
import { ReactNode } from "react";

// Shared frame for the sign-in family of pages. Pages that are not the login page itself pass
// `backTo` to show a back arrow (it goes to the previous page, or to `backTo` if there is none).
export function AuthLayout({
  title,
  subtitle,
  backTo,
  children,
}: {
  title: string;
  subtitle?: string;
  backTo?: string;
  children: ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <PointerGlow />
      <div className="absolute right-4 top-4">
        <ThemeToggle compact />
      </div>
      <div className="w-full max-w-md">
        {backTo && <BackButton fallback={backTo} className="mb-3" />}
        <div className="mb-6 flex flex-col items-center gap-2">
          <BrandIcon size={48} className="rounded-2xl shadow-card" />
          <p className="text-sm font-semibold text-brand-700">
            NearCommerce Store Portal
          </p>
        </div>
        <div className="hover-glow rounded-xl border border-slate-200 bg-white/90 p-6 shadow-card backdrop-blur sm:p-8">
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-1 text-sm text-slate-600">{subtitle}</p>
          )}
          <div className="mt-6">{children}</div>
        </div>
      </div>
    </div>
  );
}
