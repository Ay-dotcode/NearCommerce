export const AppRoutes = {
  home: "/",
  login: "/login",
  register: "/register",
  forgotPassword: "/forgot-password",
  resetPassword: "/reset-password",
  onboarding: "/owner/onboarding",
  storeOwnerDashboard: "/owner/dashboard",
  storeProfile: "/owner/profile",
} as const;

export type AppRoute = (typeof AppRoutes)[keyof typeof AppRoutes];
export { STORE_KEY } from "@nearcommerce/api";
