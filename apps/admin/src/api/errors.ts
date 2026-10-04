export interface ApiErrorDetail {
  path: string;
  message: string;
}

export interface ParsedApiError {
  message: string;
  status?: number;
  details: ApiErrorDetail[];
}

// Normalises an Axios error into something a form can show. The API sends
// `{ error, details?: [{ path, message }] }`.
export function parseApiError(
  error: unknown,
  fallback = "Something went wrong. Please try again.",
): ParsedApiError {
  const response = (
    error as { response?: { status?: number; data?: any } } | null
  )?.response;
  const data = response?.data;
  return {
    message: typeof data?.error === "string" ? data.error : fallback,
    status: response?.status,
    details: Array.isArray(data?.details)
      ? data.details.filter(
          (d: any) =>
            typeof d?.path === "string" && typeof d?.message === "string",
        )
      : [],
  };
}
