export const AppRoutes = {
  home: "/",
  login: "/login",
  register: "/register",
  storeOwnerDashboard: "/owner/dashboard",
} as const;

export type AppRoute = (typeof AppRoutes)[keyof typeof AppRoutes];
