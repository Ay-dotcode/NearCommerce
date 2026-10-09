import { StoreOwnerLayout } from "@/app/layouts/StoreOwnerLayout";
import { ProtectedRoute } from "@/app/ProtectedRoute";
import { AppRoutes } from "@/constants/routes";
import { UserRole } from "@nearcommerce/api";
import {
  createBrowserRouter,
  Navigate,
  RouterProvider,
} from "react-router-dom";

const lazyPage = <T extends Record<string, React.ComponentType>>(
  load: () => Promise<T>,
  name: keyof T,
) => ({
  lazy: async () => ({ Component: (await load())[name] }),
});

const router = createBrowserRouter(
  [
    {
      path: AppRoutes.login,
      ...lazyPage(() => import("@/features/auth/ui/LoginForm"), "LoginForm"),
    },
    {
      path: AppRoutes.register,
      ...lazyPage(
        () => import("@/features/auth/ui/RegisterForm"),
        "RegisterForm",
      ),
    },
    {
      path: AppRoutes.forgotPassword,
      ...lazyPage(
        () => import("@/features/auth/ui/ForgotPasswordForm"),
        "ForgotPasswordForm",
      ),
    },
    {
      path: AppRoutes.resetPassword,
      ...lazyPage(
        () => import("@/features/auth/ui/ResetPasswordForm"),
        "ResetPasswordForm",
      ),
    },
    {
      path: AppRoutes.verifyEmail,
      ...lazyPage(
        () => import("@/features/auth/ui/VerifyEmailPage"),
        "VerifyEmailPage",
      ),
    },
    {
      path: AppRoutes.home,
      element: <Navigate to={AppRoutes.storeOwnerDashboard} replace />,
    },
    {
      element: <ProtectedRoute role={UserRole.STORE_OWNER} />,
      children: [
        {
          path: AppRoutes.onboarding,
          ...lazyPage(
            () => import("@/pages/store-owner/StoreOnboardingPage"),
            "StoreOnboardingPage",
          ),
        },
        {
          element: <StoreOwnerLayout />,
          children: [
            {
              path: AppRoutes.storeOwnerDashboard,
              lazy: async () => ({
                Component: (await import("@/pages/store-owner/Dashboard"))
                  .default,
              }),
            },
            {
              path: AppRoutes.storeProfile,
              ...lazyPage(
                () => import("@/pages/owner/StoreProfile"),
                "StoreProfile",
              ),
            },
          ],
        },
      ],
    },
    {
      path: "*",
      element: <Navigate to={AppRoutes.storeOwnerDashboard} replace />,
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

export const AppRouter = () => (
  <RouterProvider
    router={router}
    fallbackElement={
      <p role="status" className="p-6 text-sm text-slate-500">
        Loading…
      </p>
    }
  />
);
