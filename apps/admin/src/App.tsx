import { AdminLayout, ProtectedRoute } from "@/components/AdminLayout";
import AuditLogs from "@/pages/AuditLogs";
import Dashboard from "@/pages/Dashboard";
import LoginPage from "@/pages/Login";
import Reviews from "@/pages/Reviews";
import Stores from "@/pages/Stores";
import Users from "@/pages/Users";
import { restoreSession } from "@/session";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

const queryClient = new QueryClient();

export default function App() {
  restoreSession();

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<AdminLayout />}>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/users" element={<Users />} />
              <Route path="/stores" element={<Stores />} />
              <Route path="/reviews" element={<Reviews />} />
              <Route path="/audit-logs" element={<AuditLogs />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
