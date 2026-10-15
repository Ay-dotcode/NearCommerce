import { getAccessToken, getUserRole, signOutEverywhere } from "@/session";
import { cn } from "@nearcommerce/helpers";
import { BrandIcon, Button, Drawer } from "@nearcommerce/ui";
import { useState } from "react";
import {
  Navigate,
  NavLink,
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

export const NAV_ITEMS = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/users", label: "Users" },
  { to: "/stores", label: "Stores" },
  { to: "/categories", label: "Categories" },
  { to: "/reviews", label: "Reviews" },
  { to: "/audit-logs", label: "Audit ledger" },
] as const;

// Persistent shell for all admin pages: header with nav links (a drawer on small screens)
// and a sign-out button.
export function AdminLayout() {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const signOut = () => {
    void signOutEverywhere();
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              className="md:hidden"
              aria-label="Open menu"
              onClick={() => setMenuOpen(true)}
            >
              <span aria-hidden="true">☰</span>
            </Button>
            <BrandIcon size={36} className="rounded-xl" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-700">
                NearCommerce
              </p>
              <h1 className="text-lg font-semibold leading-tight">
                System Admin Oversight
              </h1>
            </div>
          </div>
          <nav aria-label="Primary" className="hidden gap-4 text-sm md:flex">
            {NAV_ITEMS.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  isActive
                    ? "font-medium text-brand-700"
                    : "text-slate-500 hover:text-slate-900"
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>
          <Button variant="secondary" size="sm" onClick={signOut}>
            Sign out
          </Button>
        </div>
      </header>

      <Drawer
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        title="Menu"
        side="left"
      >
        <nav aria-label="Mobile" className="flex flex-col gap-1">
          {NAV_ITEMS.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setMenuOpen(false)}
              className={({ isActive }) =>
                cn(
                  "rounded-md px-3 py-2 text-sm font-medium",
                  isActive
                    ? "bg-brand-50 text-brand-700"
                    : "text-slate-700 hover:bg-slate-100",
                )
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>
      </Drawer>

      <main className="mx-auto max-w-7xl p-4 sm:p-6">
        <Outlet />
      </main>
    </div>
  );
}
