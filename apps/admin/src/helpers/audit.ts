// Plain-language names for the actions recorded in the audit ledger.
export const ACTION_LABELS: Record<string, string> = {
  SUSPEND_USER: "Suspended a user",
  UNSUSPEND_USER: "Unsuspended a user",
  PROMOTE_ADMIN: "Made a user an admin",
  DEMOTE_ADMIN: "Demoted an admin",
  DELETE_USER: "Deleted a user",
  SUSPEND_STORE: "Suspended a store",
  UNSUSPEND_STORE: "Unsuspended a store",
  DELETE_STORE: "Deleted a store",
  DELETE_REVIEW: "Deleted a review",
  DELETE_CATEGORY: "Deleted a category",
  DELETE_SUBCATEGORY: "Deleted a subcategory",
};

export const actionLabel = (action: string) =>
  ACTION_LABELS[action] ??
  action.charAt(0) + action.slice(1).toLowerCase().replace(/_/g, " ");
