export const RATE_LIMIT_WINDOW_MINUTES = 15;
export const RATE_LIMIT_WINDOW_MS = RATE_LIMIT_WINDOW_MINUTES * 60 * 1000; // 15 minutes
export const RATE_LIMIT_MAX_REQUESTS = 5; // Limit each IP to 5 requests per windowMs
export const RESEND_RATE_LIMIT_MAX_REQUESTS = 3; // Limit resend requests to 3 per 15 minutes per IP
