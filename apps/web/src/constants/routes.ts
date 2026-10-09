export const AppRoutes = {
  home: "/",
  login: "/login",
  register: "/register",
  forgotPassword: "/forgot-password",
  resetPassword: "/reset-password",
  verifyEmail: "/verify-email",
  onboarding: "/owner/onboarding",
  storeOwnerDashboard: "/owner/dashboard",
  storeProfile: "/owner/profile",
} as const;

export type AppRoute = (typeof AppRoutes)[keyof typeof AppRoutes];
