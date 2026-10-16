import { AdminAurora } from "@/components/AdminAurora";
import { CommandPalette } from "@/components/CommandPalette";
import { isPaletteShortcut, type PaletteCommand } from "@/helpers/commands";
import { getAccessToken, getUserRole, signOutEverywhere } from "@/session";
import { cn } from "@nearcommerce/helpers";
import {
  BrandIcon,
  Button,
  Drawer,
  PageTransition,
  PointerGlow,
  ThemeToggle,
  useThemePreference,
} from "@nearcommerce/ui";
import { useEffect, useMemo, useState } from "react";
import {
  Link,
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
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const { preference, setPreference } = useThemePreference();

  // Ctrl+K / Cmd+K opens the command palette from anywhere in the console.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!isPaletteShortcut(e)) return;
      e.preventDefault();
      setPaletteOpen((open) => !open);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  const signOut = () => {
    void signOutEverywhere();
    navigate("/login", { replace: true });
  };

  const commands = useMemo<PaletteCommand[]>(
    () => [
      ...NAV_ITEMS.map(({ to, label }) => ({
        id: `go-${to}`,
        label,
        group: "Go to",
        run: () => navigate(to),
      })),
      {
        id: "theme",
        label: "Switch theme (Auto → Light → Dark)",
        keywords: ["dark", "light", "appearance"],
        group: "Action",
        run: () =>
          setPreference(
            preference === "system"
              ? "light"
              : preference === "light"
                ? "dark"
                : "system",
          ),
      },
      {
        id: "sign-out",
        label: "Sign out",
        keywords: ["logout", "log out"],
        group: "Action",
        run: signOut,
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [navigate, preference, setPreference],
  );

  return (
    <div className="relative min-h-screen text-slate-900">
      <AdminAurora />
      <PointerGlow />
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/80 px-4 py-3 backdrop-blur-md sm:px-6">
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
            {/* The icon and name take you back to the default page. */}
            <Link
              to="/dashboard"
              aria-label="NearCommerce home"
              className="hover-outline press flex items-center gap-3 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            >
              <BrandIcon size={36} className="rounded-xl" />
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-700">
                  NearCommerce
                </p>
                <h1 className="text-lg font-semibold leading-tight">
                  System Admin Oversight
                </h1>
              </div>
            </Link>
          </div>
          <nav aria-label="Primary" className="hidden gap-4 text-sm md:flex">
            {NAV_ITEMS.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  cn(
                    "hover-underline pb-0.5",
                    isActive
                      ? "font-medium text-brand-700"
                      : "text-slate-500 hover:text-slate-900",
                  )
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="hidden sm:inline-flex"
              onClick={() => setPaletteOpen(true)}
              aria-label="Open command palette"
            >
              <span className="text-slate-500">Quick find</span>
              <kbd className="ml-2 rounded border border-slate-300 px-1.5 text-xs text-slate-500">
                Ctrl K
              </kbd>
            </Button>
            <ThemeToggle compact />
            <Button variant="secondary" size="sm" onClick={signOut}>
              Sign out
            </Button>
          </div>
        </div>
      </header>

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        commands={commands}
      />

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
        <PageTransition transitionKey={pathname}>
          <Outlet />
        </PageTransition>
      </main>
    </div>
  );
}
