import type { UserRole as ApiUserRole } from "@nearcommerce/api";
export type UserRole = `${ApiUserRole}`;

export interface AdminUser {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  is_suspended: boolean;
  // True for admins added from the server (pnpm add-admin); other admins cannot change them.
  is_root_admin?: boolean;
  email_verified_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface AdminUserDetails extends AdminUser {
  stores: { id: string; name: string; is_suspended: boolean }[];
  review_count: number;
  list_count: number;
}

export interface AdminAuditLog {
  id: string;
  admin_id: string | null;
  admin_email?: string | null;
  action: string;
  target_id: string;
  target_type: string;
  reason: string | null;
  snapshot: Record<string, unknown> | null;
  created_at: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: { page: number; limit: number; total: number };
}

export interface ActivityDay {
  date: string;
  users: number;
  stores: number;
  reviews: number;
}

export interface GlobalMetrics {
  totalActiveStores: number;
  newRegistrations: number;
  flaggedItems: number;
  suspendedUsers: number;
  totals: { users: number; stores: number; products: number; reviews: number };
  usersByRole: Record<UserRole, number>;
  catalog: {
    published: number;
    drafts: number;
    outOfStock: number;
    stale: number;
  };
  // The last 14 days, oldest first.
  activity: ActivityDay[];
}

export interface AdminStore {
  id: string;
  name: string;
  owner_id: string;
  owner_email?: string;
  owner_name?: string;
  address?: string;
  is_suspended: boolean;
  created_at?: string;
}

export interface AdminReview {
  id: string;
  user_id: string;
  store_id: string | null;
  product_id: string | null;
  rating: number;
  comment: string | null;
  created_at: string;
  updated_at: string | null;
  reviewer_name: string;
  reviewer_email: string;
  target_type: "STORE" | "PRODUCT";
  target_name: string | null;
}

export interface AdminSubcategory {
  id: string;
  name: string;
  product_count: number;
}

export interface AdminCategory {
  id: string;
  name: string;
  icon_url: string | null;
  product_count: number;
  subcategories: AdminSubcategory[];
}

export interface CategoryDeleteResult {
  message: string;
  affected_products: number;
  deleted_subcategories?: number;
}

export interface UserFilters {
  q?: string;
  role?: UserRole;
  status?: "active" | "suspended";
}
