import { AdminLayout, ProtectedRoute } from "@/components/AdminLayout";
import { restoreSession } from "@/session";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

const AuditLogs = lazy(() => import("@/pages/AuditLogs"));
const Categories = lazy(() => import("@/pages/Categories"));
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const LoginPage = lazy(() => import("@/pages/Login"));
const Reviews = lazy(() => import("@/pages/Reviews"));
const Stores = lazy(() => import("@/pages/Stores"));
const Users = lazy(() => import("@/pages/Users"));

const queryClient = new QueryClient();

export default function App() {
  restoreSession();

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <Suspense
          fallback={
            <p role="status" className="p-6 text-sm text-slate-400">
              Loading…
            </p>
          }
        >
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route element={<ProtectedRoute />}>
              <Route element={<AdminLayout />}>
                <Route
                  path="/"
                  element={<Navigate to="/dashboard" replace />}
                />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/users" element={<Users />} />
                <Route path="/stores" element={<Stores />} />
                <Route path="/categories" element={<Categories />} />
                <Route path="/reviews" element={<Reviews />} />
                <Route path="/audit-logs" element={<AuditLogs />} />
              </Route>
            </Route>
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
