import { StoreOwnerLayout } from "@/app/layouts/StoreOwnerLayout";
import { ProtectedRoute } from "@/app/ProtectedRoute";
import { AppRoutes } from "@/constants/routes";
import { LoginForm } from "@/features/auth/ui/LoginForm";
import { RegisterForm } from "@/features/auth/ui/RegisterForm";
import StoreOwnerDashboard from "@/pages/store-owner/Dashboard";
import { UserRole } from "@nearcommerce/api";
import {
  createBrowserRouter,
  Navigate,
  RouterProvider,
} from "react-router-dom";

const router = createBrowserRouter(
  [
    {
      path: AppRoutes.login,
      element: <LoginForm />,
    },
    {
      path: AppRoutes.register,
      element: <RegisterForm />,
    },
    {
      path: AppRoutes.home,
      element: <Navigate to={AppRoutes.login} replace />,
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
    {
      path: "*",
      element: <Navigate to={AppRoutes.login} replace />,
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
