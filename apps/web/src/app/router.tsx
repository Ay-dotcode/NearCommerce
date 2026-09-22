import { AdminLayout } from "@/app/layouts/AdminLayout";
import { StoreOwnerLayout } from "@/app/layouts/StoreOwnerLayout";
import { ProtectedRoute } from "@/app/ProtectedRoute";
import { AppRoutes } from "@/constants/routes";
import { LoginForm } from "@/features/auth/ui/LoginForm";
import StoreOwnerDashboard from "@/pages/store-owner/Dashboard";
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
      path: AppRoutes.login,
      element: <LoginForm />,
    },
    {
      path: AppRoutes.home,
      element: <Navigate to={AppRoutes.login} replace />,
    },
    {
      element: <ProtectedRoute role={UserRole.SYSTEM_ADMIN} />,
      children: [
        {
          element: (
            <AdminLayout>
              <AdminDashboard />
            </AdminLayout>
          ),
          path: AppRoutes.adminDashboard,
        },
      ],
    },
    {
      element: <ProtectedRoute role={UserRole.STORE_OWNER} />,
      children: [
        {
          element: (
            <StoreOwnerLayout>
              <StoreOwnerDashboard />
            </StoreOwnerLayout>
          ),
          path: AppRoutes.storeOwnerDashboard,
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
