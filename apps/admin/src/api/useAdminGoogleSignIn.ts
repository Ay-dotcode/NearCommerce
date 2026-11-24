import { persistSession } from "@/session";
import {
  apiClient,
  UserRole,
  type GoogleAuthResponse,
} from "@nearcommerce/api";
import { useMutation } from "@tanstack/react-query";

// TanStack Query mutation for `POST /auth/google`: signs in a SYSTEM_ADMIN with
// the credential Google's button returned.
export function useAdminGoogleSignIn() {
  return useMutation({
    mutationFn: async (idToken: string) => {
      const response = await apiClient.post<GoogleAuthResponse>(
        "/auth/google",
        { id_token: idToken, role: UserRole.STORE_OWNER },
      );
      return response.data;
    },
    onSuccess: (data) => {
      if (data.access_token && data.user.role === UserRole.SYSTEM_ADMIN)
        persistSession(data.access_token, data.refresh_token);
    },
  });
}
