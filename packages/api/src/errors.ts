export interface ApiErrorDetail {
  path: string;
  message: string;
}

export interface ParsedApiError {
  message: string;
  status?: number;
  details: ApiErrorDetail[];
  code?: string;
}

// Normalises an Axios error (or anything thrown) into something the UI can render.
// The backend sends `{ error, code?, details?: [{ path, message }] }`.
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
    code: typeof data?.code === "string" ? data.code : undefined,
    details: Array.isArray(data?.details)
      ? data.details.filter(
          (d: any) =>
            typeof d?.path === "string" && typeof d?.message === "string",
        )
      : [],
  };
}

// Message for a failed sign-in. Wrong credentials stay deliberately vague; lockouts and
// suspensions say why, and a missing response means the server could not be reached.
export function loginErrorMessage(error: unknown): string {
  const response = (
    error as {
      response?: { status?: number; data?: { error?: string } };
    } | null
  )?.response;
  if (!response)
    return "Can't reach the server. Check your connection and try again.";
  if (
    (response.status === 403 || response.status === 429) &&
    typeof response.data?.error === "string"
  )
    return response.data.error;
  return "Invalid email or password.";
}
