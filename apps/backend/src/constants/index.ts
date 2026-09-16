import path from "path";

// Environment Constants
export const ENV_PATH = path.resolve(__dirname, "../../../../.env");

// Token & Auth Constants
export const EMAIL_VERIFICATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
export const BCRYPT_SALT_ROUNDS = 12;

// Rate Limiter Constants
export const RATE_LIMIT_WINDOW_MINUTES = 15;
export const RATE_LIMIT_WINDOW_MS = RATE_LIMIT_WINDOW_MINUTES * 60 * 1000; // 15 minutes
export const RATE_LIMIT_MAX_REQUESTS = 5; // Limit each IP to 5 requests per windowMs
export const RESEND_RATE_LIMIT_MAX_REQUESTS = 3; // Limit resend requests to 3 per 15 minutes per IP


// Server Constants
export const DEFAULT_PORT = 4000;
