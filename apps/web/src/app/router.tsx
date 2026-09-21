import { AdminLayout } from "@/app/layouts/AdminLayout";
import { StoreOwnerLayout } from "@/app/layouts/StoreOwnerLayout";
import { ProtectedRoute } from "@/app/ProtectedRoute";
import { LoginForm } from "@/features/auth/ui/LoginForm";
import { OwnerDashboard } from "@/features/products/ui/OwnerDashboard";
import { UserRole } from "@nearcommerce/api";
import {
  createBrowserRouter,
  Navigate,
  RouterProvider,
} from "react-router-dom";

// ---------------------------------------------------------------------------
// Placeholder dashboard components — AdminDashboard will be replaced in Task 4.3
// ---------------------------------------------------------------------------
const AdminDashboard = () => <div>Master Oversight Portal</div>;

const router = createBrowserRouter(
  [
    {
      path: "/login",
      element: <LoginForm />,
    },
    { path: "/", element: <Navigate to="/login" replace /> },
    {
      element: <ProtectedRoute role={UserRole.SYSTEM_ADMIN} />,
      children: [
        {
          element: (
            <AdminLayout>
              <AdminDashboard />
            </AdminLayout>
          ),
          path: "/admin/dashboard",
        },
      ],
    },
    {
      element: <ProtectedRoute role={UserRole.STORE_OWNER} />,
      children: [
        {
          element: (
            <StoreOwnerLayout>
              <OwnerDashboard />
            </StoreOwnerLayout>
          ),
          path: "/owner/dashboard",
        },
      ],
    },
  ],
  {
    future: {
      v7_relativeSplatPath: true,
      v7_fetcherPersist: true,
      v7_normalizeFormMethod: true,
      v7_partialHydration: true,
      v7_skipActionErrorRevalidation: true,
    },
  },
);

export const AppRouter = () => <RouterProvider router={router} />;
