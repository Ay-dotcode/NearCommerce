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
    error as {
      response?: {
        status?: number;
        data?: { error?: unknown; code?: unknown; details?: unknown };
      };
    } | null
  )?.response;
  const data = response?.data;
  return {
    message: typeof data?.error === "string" ? data.error : fallback,
    status: response?.status,
    code: typeof data?.code === "string" ? data.code : undefined,
    details: Array.isArray(data?.details)
      ? data.details.filter(
          (d: Partial<ApiErrorDetail> | null): d is ApiErrorDetail =>
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

export const ACCOUNT_SUSPENDED_CODE = "ACCOUNT_SUSPENDED";

// True when a failed request or sign-in was refused because the account is suspended. Clients
// use it to offer a "Contact support" link next to the message.
export function isSuspendedError(error: unknown): boolean {
  const { status, code, message } = parseApiError(error);
  return (
    status === 403 &&
    (code === ACCOUNT_SUSPENDED_CODE || /suspended/i.test(message))
  );
}

// Message for a failed "Continue with Google". The server words its own refusals (account
// exists, suspended, not configured, too many attempts), so those are shown as they are; a
// missing response means the server could not be reached.
export function googleSignInErrorMessage(error: unknown): string {
  const { status, message } = parseApiError(error, "");
  if (status === undefined)
    return "Can't reach the server. Check your connection and try again.";
  if (message && [401, 403, 409, 429, 503].includes(status)) return message;
  return "Google sign-in failed. Please try again.";
}

export const EMAIL_EXISTS_CODE = "EMAIL_EXISTS_USE_PASSWORD";
