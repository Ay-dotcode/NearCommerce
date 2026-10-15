import type { AdminStore } from "@/types/admin";

export type StoreAction = { kind: "suspend" | "delete"; store: AdminStore };

// Wording for the confirmation dialog of each store moderation action.
export function storeActionCopy({ kind, store }: StoreAction) {
  if (kind === "delete")
    return {
      title: `Delete ${store.name}?`,
      description:
        "This permanently removes the store and all of its inventory. A snapshot is kept in the audit log.",
      confirmLabel: "Delete store",
      busyLabel: "Deleting…",
      tone: "danger" as const,
    };
  return store.is_suspended
    ? {
        title: `Unsuspend ${store.name}?`,
        description:
          "The store and its published products become visible again.",
        confirmLabel: "Unsuspend",
        busyLabel: "Unsuspending…",
        tone: "primary" as const,
      }
    : {
        title: `Suspend ${store.name}?`,
        description:
          "The store is hidden from search and direct links right away.",
        confirmLabel: "Suspend",
        busyLabel: "Suspending…",
        tone: "danger" as const,
      };
}
