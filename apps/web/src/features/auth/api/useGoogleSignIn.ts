import { persistSession } from "@/features/auth/session";
import {
  apiClient,
  UserRole,
  type GoogleAuthResponse,
} from "@nearcommerce/api";
import { useMutation } from "@tanstack/react-query";

// TanStack Query mutation for `POST /auth/google`: signs in with the credential Google's button
// returned, or creates a store owner account if this Google account is new.
//
// Like password login, the session is only kept for store owners. A shopper who picks their
// Google account here gets no stored session and is told where to go instead.
export function useGoogleSignIn() {
  return useMutation({
    mutationFn: async (idToken: string) => {
      const response = await apiClient.post<GoogleAuthResponse>(
        "/auth/google",
        { id_token: idToken, role: UserRole.STORE_OWNER },
      );
      return response.data;
    },
    onSuccess: (data) => {
      if (data.access_token && data.user.role === UserRole.STORE_OWNER)
        persistSession(
          data.access_token,
          data.user.role,
          data.user.store_id,
          data.refresh_token,
        );
    },
  });
}
