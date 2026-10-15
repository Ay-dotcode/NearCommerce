import { AppRoutes } from "@/constants/routes";

// Only owner pages are valid return targets; anything else falls back to the dashboard.
export const safeReturnPath = (from: unknown) =>
  typeof from === "string" && /^\/owner\/[\w/-]*$/.test(from)
    ? from
    : AppRoutes.storeOwnerDashboard;
