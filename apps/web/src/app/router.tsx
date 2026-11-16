import { StoreOwnerLayout } from "@/app/layouts/StoreOwnerLayout";
import { AppShellSkeleton } from "@/app/PageSkeletons";
import { ProtectedRoute } from "@/app/ProtectedRoute";
import { AppRoutes } from "@/constants/routes";
import { UserRole } from "@nearcommerce/api";
import { ErrorFallback, NotFoundPage } from "@nearcommerce/ui";
import {
  createBrowserRouter,
  Link,
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
      // Catches render errors and failed page downloads (for example right after a deploy)
      // for every route below, instead of React Router's default error screen.
      errorElement: <ErrorFallback />,
      children: [
        {
          path: AppRoutes.login,
          ...lazyPage(() => import("@/forms/LoginForm"), "LoginForm"),
        },
        {
          path: AppRoutes.register,
          ...lazyPage(() => import("@/forms/RegisterForm"), "RegisterForm"),
        },
        {
          path: AppRoutes.forgotPassword,
          ...lazyPage(
            () => import("@/forms/ForgotPasswordForm"),
            "ForgotPasswordForm",
          ),
        },
        {
          path: AppRoutes.resetPassword,
          ...lazyPage(
            () => import("@/forms/ResetPasswordForm"),
            "ResetPasswordForm",
          ),
        },
        // Email verification is switched off, so its page is not routed. The page
        // (features/auth/ui/VerifyEmailPage) and AppRoutes.verifyEmail are kept for when it
        // comes back: add this route again then.
        //   { path: AppRoutes.verifyEmail,
        //     ...lazyPage(() => import("@/features/auth/ui/VerifyEmailPage"), "VerifyEmailPage") },
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
                  path: AppRoutes.storeReviews,
                  lazy: async () => ({
                    Component: (await import("@/pages/store-owner/Reviews"))
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
          element: (
            <NotFoundPage
              action={
                <Link
                  to={AppRoutes.home}
                  className="inline-flex min-h-10 items-center rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-onbrand hover:bg-brand-700"
                >
                  Back to the dashboard
                </Link>
              }
            />
          ),
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

export const AppRouter = () => (
  <RouterProvider router={router} fallbackElement={<AppShellSkeleton />} />
);
