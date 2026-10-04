import { apiClient } from "@nearcommerce/api";
import { useMutation } from "@tanstack/react-query";

export function useForgotPassword() {
  return useMutation({
    mutationFn: async (email: string) =>
      (
        await apiClient.post<{ message: string }>("/auth/forgot-password", {
          email,
        })
      ).data,
  });
}

export function useResetPassword() {
  return useMutation({
    mutationFn: async (payload: { token: string; new_password: string }) =>
      (
        await apiClient.post<{ message: string }>(
          "/auth/reset-password",
          payload,
        )
      ).data,
  });
}
