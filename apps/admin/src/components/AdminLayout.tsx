import { clearSession, getAccessToken, getUserRole } from "@/session";
import {
  NavLink,
  Navigate,
  Outlet,
  useLocation,
  useNavigate,
} from "react-router-dom";

// Route guard: only SYSTEM_ADMIN sessions reach protected routes. All others are redirected to /login.
export function ProtectedRoute() {
  const location = useLocation();

  if (!getAccessToken() || getUserRole() !== "SYSTEM_ADMIN") {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}

//  Persistent shell for all admin pages — dark sidebar-style header with nav links and a sign-out button.

export function AdminLayout() {
  const navigate = useNavigate();

  const signOut = () => {
    clearSession();
    navigate("/login", { replace: true });
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
            {[
              ["/dashboard", "Dashboard"],
              ["/users", "Users"],
              ["/stores", "Stores"],
              ["/reviews", "Reviews"],
              ["/audit-logs", "Audit ledger"],
            ].map(([to, label]) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  isActive ? "text-cyan-300" : "text-slate-400 hover:text-white"
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>
          <button
            onClick={signOut}
            className="rounded border border-slate-600 px-3 py-2 text-sm hover:bg-slate-800"
          >
            Sign out
          </button>
        </div>
      </header>
      <main className="mx-auto max-w-7xl p-6">
        <Outlet />
      </main>
    </div>
  );
}
