import type {
  AdminAuditLog,
  AdminReview,
  AdminStore,
  AdminUser,
  GlobalMetrics,
  PaginatedResponse,
} from "@/types/admin";
import { apiClient } from "@nearcommerce/api";

export async function getGlobalMetrics() {
  const response = await apiClient.get<GlobalMetrics>("/admin/metrics");
  return response.data;
}

export async function getUsers(page = 1, limit = 20) {
  const response = await apiClient.get<PaginatedResponse<AdminUser>>(
    `/admin/users?page=${page}&limit=${limit}`,
  );
  return response.data;
}

export async function getStores(page = 1, limit = 20) {
  const response = await apiClient.get<PaginatedResponse<AdminStore>>(
    `/admin/stores?page=${page}&limit=${limit}`,
  );
  return response.data;
}

export async function toggleStoreSuspension(
  id: string,
  isSuspended: boolean,
  reason: string,
) {
  const response = await apiClient.patch(`/admin/stores/${id}/suspend`, {
    is_suspended: isSuspended,
    reason,
  });
  return response.data;
}

export async function deleteStore(id: string, reason: string) {
  const response = await apiClient.delete(`/admin/stores/${id}`, {
    data: { reason },
  });
  return response.data;
}

export async function getReviews(page = 1, limit = 20) {
  const response = await apiClient.get<PaginatedResponse<AdminReview>>(
    `/admin/reviews?page=${page}&limit=${limit}`,
  );
  return response.data;
}

export async function deleteReview(id: string, reason: string) {
  const response = await apiClient.delete(`/admin/reviews/${id}`, {
    data: { reason },
  });
  return response.data;
}

export async function toggleUserSuspension(
  id: string,
  isSuspended: boolean,
  reason: string,
) {
  const response = await apiClient.patch(`/admin/users/${id}/suspend`, {
    is_suspended: isSuspended,
    reason,
  });
  return response.data;
}

export async function getAuditLogs(page = 1, limit = 50) {
  const response = await apiClient.get<PaginatedResponse<AdminAuditLog>>(
    `/admin/audit-logs?page=${page}&limit=${limit}`,
  );
  return response.data;
}
