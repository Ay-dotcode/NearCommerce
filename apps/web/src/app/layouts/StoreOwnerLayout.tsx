import { AppRoutes } from "@/constants/routes";
import { clearSession } from "@/features/auth/session";
import { ReactNode } from "react";
import { useNavigate } from "react-router-dom";

export function StoreOwnerLayout({ children }: { children: ReactNode }) {
  const navigate = useNavigate();

  const signOut = () => {
    clearSession();
    navigate(AppRoutes.login, { replace: true });
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <header className="border-b border-slate-200 bg-white px-6 py-4 shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">
              NearCommerce
            </p>
            <h1 className="text-lg font-semibold">Store Inventory Dashboard</h1>
          </div>
          <button
            onClick={signOut}
            className="rounded border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50"
          >
            Sign out
          </button>
        </div>
      </header>
      <main className="mx-auto max-w-7xl">{children}</main>
    </div>
  );
}
