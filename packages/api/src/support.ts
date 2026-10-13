import { apiClient } from "./client";

export interface SupportChannels {
  channels: { email: string; phone: string };
}

export async function getSupportChannels(): Promise<SupportChannels> {
  const response = await apiClient.get<SupportChannels>("/support");
  return response.data;
}
