import type { AdminUser, UserRole } from "@/types/admin";

export type UserActionKind = "suspend" | "demote" | "delete" | "promote";

export const ROLE_LABELS: Record<UserRole, string> = {
  CUSTOMER: "Customer",
  STORE_OWNER: "Store owner",
  SYSTEM_ADMIN: "System admin",
};

export function userActionRules(user: AdminUser, isSelf: boolean) {
  const isAdmin = user.role === "SYSTEM_ADMIN";
  return {
    isAdmin,
    canSuspend: !isAdmin,
    suspendHint: isAdmin ? "Demote an admin before suspending" : undefined,
    showDemote: isAdmin,
    canDemote: !isSelf,
    demoteHint: isSelf
      ? "Another admin must demote you"
      : user.is_root_admin
        ? "Added by the platform owner: only another owner-added admin can demote them"
        : undefined,
    showPromote: !isAdmin,
    canPromote: !user.is_suspended,
    promoteHint: user.is_suspended ? "Unsuspend this user first" : undefined,
    isOwnerAdmin: isAdmin && user.is_root_admin === true,
    canDelete: !isAdmin && !isSelf,
    deleteHint: isAdmin
      ? "Demote this admin before deleting the account"
      : undefined,
  };
}

export function actionDialogCopy(kind: UserActionKind, user: AdminUser) {
  if (kind === "promote")
    return {
      title: `Make ${user.email} an admin?`,
      description:
        "They get full access to the admin console: users, stores, reviews and categories. Enter your own password to confirm.",
      confirmLabel: "Make admin",
      busyLabel: "Promoting…",
      tone: "primary" as const,
    };
  if (kind === "demote")
    return {
      title: `Demote ${user.email}?`,
      description:
        "They become a customer, lose access to the admin console immediately and are signed out everywhere.",
      confirmLabel: "Demote to customer",
      busyLabel: "Demoting…",
      tone: "danger" as const,
    };
  if (kind === "delete")
    return {
      title: `Delete ${user.email}?`,
      description:
        "This permanently removes the account, their stores, products and reviews. Household lists they own pass to the next member. A snapshot is kept in the audit log.",
      confirmLabel: "Delete account",
      busyLabel: "Deleting…",
      tone: "danger" as const,
    };
  return user.is_suspended
    ? {
        title: `Unsuspend ${user.email}?`,
        description: "They can sign in again and their stores become visible.",
        confirmLabel: "Unsuspend",
        busyLabel: "Unsuspending…",
        tone: "primary" as const,
      }
    : {
        title: `Suspend ${user.email}?`,
        description:
          "They are blocked immediately and their stores and products are hidden from shoppers.",
        confirmLabel: "Suspend",
        busyLabel: "Suspending…",
        tone: "danger" as const,
      };
}
