export const AppRoutes = {
  home: "/",
  login: "/login",
  adminDashboard: "/admin/dashboard",
  adminUsers: "/admin/users",
  adminStores: "/admin/stores",
  adminReviews: "/admin/reviews",
  adminAuditLogs: "/admin/audit-logs",
  storeOwnerDashboard: "/owner/dashboard",
} as const;

export type AppRoute = (typeof AppRoutes)[keyof typeof AppRoutes];
