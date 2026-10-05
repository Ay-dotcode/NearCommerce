// Query-key tuples used with TanStack Query throughout the admin app.
export const ADMIN_USERS_KEY = ["admin-users"] as const;
export const ADMIN_CATEGORIES_KEY = ["admin-categories"] as const;

// Moderation actions require a written reason; the API rejects anything shorter.
export const MIN_REASON_LENGTH = 5;
