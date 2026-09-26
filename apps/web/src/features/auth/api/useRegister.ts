import { apiClient, RegisterInput } from "@nearcommerce/api";
import { useMutation } from "@tanstack/react-query";

interface RegisterResponse {
  message: string;
}

export function useRegister() {
  return useMutation({
    mutationFn: async (payload: RegisterInput) => {
      const response = await apiClient.post<RegisterResponse>(
        "/auth/register",
        payload,
      );
      return response.data;
    },
  });
}
