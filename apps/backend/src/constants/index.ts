// Token & Auth Constants
export const EMAIL_VERIFICATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
export const BCRYPT_SALT_ROUNDS = 12;

// Rate Limiter Constants
export const RATE_LIMIT_WINDOW_MINUTES = 15;
export const RATE_LIMIT_WINDOW_MS = RATE_LIMIT_WINDOW_MINUTES * 60 * 1000; // 15 minutes
export const RATE_LIMIT_MAX_REQUESTS = 5; // Limit each IP to 5 requests per windowMs
export const RATE_LIMIT_MESSAGE = `Too many requests from this IP, please try again after ${RATE_LIMIT_WINDOW_MINUTES} minutes`;
