export type UserRole = "CUSTOMER" | "STORE_OWNER" | "SYSTEM_ADMIN";

export interface AdminUser {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  is_suspended: boolean;
  created_at: string;
  updated_at: string;
}

export interface AdminAuditLog {
  id: string;
  admin_id: string | null;
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

export interface GlobalMetrics {
  totalActiveStores: number;
  newRegistrations: number;
  flaggedItems: number;
  suspendedUsers: number;
}

export interface AdminStore {
  id: string;
  name: string;
  owner_id: string;
  is_suspended: boolean;
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
