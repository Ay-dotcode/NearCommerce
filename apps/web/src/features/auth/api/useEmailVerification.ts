import { ME_KEY } from "@/constants";
import { apiClient } from "@nearcommerce/api";
import { useMutation, useQuery } from "@tanstack/react-query";

export interface Me {
  id: string;
  email: string;
  full_name: string;
  email_verified: boolean;
}

export function useVerifyEmail() {
  return useMutation({
    mutationFn: async (token: string) =>
      (
        await apiClient.post<{ message: string }>("/auth/verify-email", {
          token,
        })
      ).data,
  });
}

export function useResendVerification() {
  return useMutation({
    mutationFn: async (email: string) =>
      (
        await apiClient.post<{ message: string }>("/auth/resend-verification", {
          email,
        })
      ).data,
  });
}

// The signed-in user's profile, used to prompt for an unverified email address.
export function useMe() {
  return useQuery({
    queryKey: ME_KEY,
    queryFn: async () => (await apiClient.get<Me>("/users/me")).data,
    retry: false,
    staleTime: 60_000,
  });
}
