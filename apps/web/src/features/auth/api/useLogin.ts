import { apiClient } from "@nearcommerce/api";
import { useMutation } from "@tanstack/react-query";

interface LoginPayload {
  email: string;
  password: string;
}

interface AuthResponse {
  access_token: string;
  refresh_token?: string;
  // Fallbacks for test mocks that use camelCase
  accessToken?: string;
  user: {
    id: string;
    role: "STORE_OWNER" | "SYSTEM_ADMIN" | "CUSTOMER";
    store_id?: string;
    storeId?: string;
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
      const data = response.data;
      const token = data.access_token || data.accessToken || "";
      const storeId = data.user.store_id || data.user.storeId;

      return {
        access_token: token,
        accessToken: token,
        user: {
          ...data.user,
          store_id: storeId,
          storeId: storeId,
        },
      };
    },
    onSuccess: (data) => {
      if (data.access_token) {
        apiClient.defaults.headers.common["Authorization"] =
          `Bearer ${data.access_token}`;
      }

      if (data.user.store_id) {
        // Automatically scope every request to the authenticated store
        apiClient.defaults.headers.common["X-Store-ID"] = data.user.store_id;
      }
    },
  });
}
