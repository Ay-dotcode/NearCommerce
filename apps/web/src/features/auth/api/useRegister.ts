import { persistSession } from "@/features/auth/session";
import { apiClient, RegisterInput, UserRole, type AuthResponse } from "@nearcommerce/api";
import { useMutation } from "@tanstack/react-query";

// POST /auth/register then immediately POST /auth/login so the store owner
// lands in their dashboard without having to sign in a second time.
export function useRegister() {
  return useMutation({
    mutationFn: async (payload: RegisterInput) => {
      // 1. Create the account.
      await apiClient.post<{ message: string }>("/auth/register", payload);

      // 2. Log in straight away — the backend marks accounts as verified on
      //    creation (email verification is disabled), so this always succeeds.
      const loginRes = await apiClient.post<AuthResponse>("/auth/login", {
        email: payload.email,
        password: payload.password,
      });

      return loginRes.data;
    },
    onSuccess: (data) => {
      // Persist session exactly like useLogin does.
      if (
        data.access_token &&
        (data.user.role === UserRole.SYSTEM_ADMIN ||
          data.user.role === UserRole.STORE_OWNER)
      )
        persistSession(
          data.access_token,
          data.user.role,
          data.user.store_id,
          data.refresh_token,
        );
    },
  });
}
