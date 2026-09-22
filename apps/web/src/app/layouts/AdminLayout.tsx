import { AppRoutes } from "@/constants/routes";
import { clearSession } from "@/features/auth/session";
import { ReactNode } from "react";
import { NavLink, useNavigate } from "react-router-dom";

export function AdminLayout({ children }: { children: ReactNode }) {
  const navigate = useNavigate();

  const signOut = () => {
    clearSession();
    navigate(AppRoutes.login, { replace: true });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900 px-6 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-400">
              NearCommerce
            </p>
            <h1 className="text-lg font-semibold">System Admin Oversight</h1>
          </div>
          <nav className="hidden gap-4 text-sm md:flex">
            <NavLink
              to={AppRoutes.adminDashboard}
              className={({ isActive }) =>
                isActive ? "text-cyan-300" : "text-slate-400 hover:text-white"
              }
            >
              Dashboard
            </NavLink>
            <NavLink
              to={AppRoutes.adminUsers}
              className={({ isActive }) =>
                isActive ? "text-cyan-300" : "text-slate-400 hover:text-white"
              }
            >
              Users
            </NavLink>
            <NavLink
              to={AppRoutes.adminStores}
              className={({ isActive }) =>
                isActive ? "text-cyan-300" : "text-slate-400 hover:text-white"
              }
            >
              Stores
            </NavLink>
            <NavLink
              to={AppRoutes.adminReviews}
              className={({ isActive }) =>
                isActive ? "text-cyan-300" : "text-slate-400 hover:text-white"
              }
            >
              Reviews
            </NavLink>
            <NavLink
              to={AppRoutes.adminAuditLogs}
              className={({ isActive }) =>
                isActive ? "text-cyan-300" : "text-slate-400 hover:text-white"
              }
            >
              Audit ledger
            </NavLink>
          </nav>
          <button
            onClick={signOut}
            className="rounded border border-slate-600 px-3 py-2 text-sm hover:bg-slate-800"
          >
            Sign out
          </button>
        </div>
      </header>
      <main className="mx-auto max-w-7xl p-6">{children}</main>
    </div>
  );
}
