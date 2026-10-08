import { apiClient } from "@nearcommerce/api";

export interface Me {
  id: string;
  email: string;
  full_name: string;
  email_verified: boolean;
}

export async function fetchMe(): Promise<Me> {
  return (await apiClient.get<Me>("/users/me")).data;
}

// Always answers the same way, whether or not the address exists.
export async function resendVerification(email: string): Promise<string> {
  const res = await apiClient.post<{ message: string }>(
    "/auth/resend-verification",
    { email },
  );
  return res.data.message;
}
