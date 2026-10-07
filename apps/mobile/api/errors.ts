export function apiErrorMessage(error: unknown, fallback: string) {
  const msg = (error as { response?: { data?: { error?: string } } })?.response
    ?.data?.error;
  return msg || fallback;
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
