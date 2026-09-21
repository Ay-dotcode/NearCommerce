export const AppRoutes = {
  home: "/",
  login: "/login",
  adminDashboard: "/admin/dashboard",
  storeOwnerDashboard: "/owner/dashboard",
} as const;

export type AppRoute = (typeof AppRoutes)[keyof typeof AppRoutes];
