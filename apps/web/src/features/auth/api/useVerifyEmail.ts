import { apiClient } from "@nearcommerce/api";
import { useMutation } from "@tanstack/react-query";

interface VerifyEmailResponse {
  message: string;
}

export function useVerifyEmail() {
  return useMutation({
    mutationFn: async (token: string) => {
      const response = await apiClient.post<VerifyEmailResponse>(
        "/auth/verify-email",
        { token },
      );
      return response.data;
    },
  });
}
