export interface AdminUser {
  id: string;
  email: string;
  full_name: string;
  role: string;
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
}
