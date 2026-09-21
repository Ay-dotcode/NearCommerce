import { persistSession } from "@/features/auth/session";
import { apiClient, UserRole } from "@nearcommerce/api";
import { useMutation } from "@tanstack/react-query";

interface LoginPayload {
  email: string;
  password: string;
}

interface AuthResponse {
  access_token: string;
  refresh_token?: string;
  user: {
    id: string;
    role: UserRole;
    store_id?: string;
  };
}

/**
 * TanStack Query mutation for the `/auth/login` endpoint.
 *
 * On success the access token is attached to all subsequent Axios requests as a
 * Bearer token.  For Store Owners the `X-Store-ID` header is also pre-populated
 * so every inventory request is automatically scoped to the correct store
 * without the caller having to remember to set it.
 */
export function useLogin() {
  return useMutation({
    mutationFn: async (credentials: LoginPayload) => {
      const response = await apiClient.post<AuthResponse>(
        "/auth/login",
        credentials,
      );
      return response.data;
    },
    onSuccess: (data) => {
      if (
        data.access_token &&
        (data.user.role === UserRole.SYSTEM_ADMIN ||
          data.user.role === UserRole.STORE_OWNER)
      )
        persistSession(data.access_token, data.user.role, data.user.store_id);
    },
  });
}
