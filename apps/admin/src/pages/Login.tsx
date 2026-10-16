import { AdminAurora } from "@/components/AdminAurora";
import { LoginForm } from "@/forms/LoginForm";
import { BrandIcon, PointerGlow, ThemeToggle } from "@nearcommerce/ui";

// Admin-only login page. Accepts only SYSTEM_ADMIN credentials: any other
// role receives a clear "Access denied" error rather than a silent failure.
export default function LoginPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center px-4">
      <AdminAurora />
      <PointerGlow />
      <div className="absolute right-4 top-4">
        <ThemeToggle compact />
      </div>
      <div className="hover-glow w-full max-w-sm rounded-lg border border-slate-200 bg-white/90 p-8 shadow-overlay backdrop-blur">
        <BrandIcon size={48} className="rounded-2xl shadow-card" />
        <p className="mt-4 text-xs font-semibold uppercase tracking-[0.2em] text-brand-700">
          NearCommerce
        </p>
        <h1 className="mt-1 text-2xl font-bold">System Admin Portal</h1>
        <p className="mt-1 text-sm text-slate-500">
          Restricted access — admins only.
        </p>

        <LoginForm />
      </div>
    </div>
  );
}
