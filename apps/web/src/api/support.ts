import { apiClient } from "@nearcommerce/api";

export interface SupportChannels {
  channels: { email: string; phone: string };
  operating_hours: string;
}

export async function getSupportChannels(): Promise<SupportChannels> {
  const response = await apiClient.get<SupportChannels>("/support");
  return response.data;
}
