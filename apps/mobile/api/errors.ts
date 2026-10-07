export { loginErrorMessage, parseApiError } from "@nearcommerce/api";

export function apiErrorMessage(error: unknown, fallback: string) {
  const msg = (error as { response?: { data?: { error?: string } } })?.response
    ?.data?.error;
  return msg || fallback;
}
