export const AppRoutes = {
  home: "/",
  login: "/login",
  register: "/register",
  onboarding: "/owner/onboarding",
  storeOwnerDashboard: "/owner/dashboard",
  storeProfile: "/owner/profile",
} as const;

export type AppRoute = (typeof AppRoutes)[keyof typeof AppRoutes];
export const STORE_KEY = "x-store-id";
