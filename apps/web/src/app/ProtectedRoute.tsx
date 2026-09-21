import {
  getAccessToken,
  getUserRole,
  PortalRole,
} from "@/features/auth/session";
import { Navigate, Outlet, useLocation } from "react-router-dom";

export function ProtectedRoute({ role }: { role: PortalRole }) {
  const location = useLocation();

  if (!getAccessToken() || getUserRole() !== role)
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;

  return <Outlet />;
}
