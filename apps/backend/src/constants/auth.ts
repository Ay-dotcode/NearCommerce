import { ENV_PATH } from "@/constants/env";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: ENV_PATH });
if (!process.env.DATABASE_URL)
  dotenv.config({ path: path.resolve(process.cwd(), ".env") });

export const JWT_ACCESS_SECRET =
  process.env.JWT_ACCESS_SECRET || "fallback_secret_do_not_use_in_prod";
export const JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET || "fallback_refresh_do_not_use_in_prod";

export const JWT_ACCESS_EXPIRY = "15m";
export const JWT_ACCESS_EXPIRY_SECONDS = 15 * 60; // 900 seconds
export const EMAIL_VERIFICATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
export const PASSWORD_RESET_TOKEN_TTL_MS = 1 * 60 * 60 * 1000; // 1 hour
export const USER_SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
export const BCRYPT_SALT_ROUNDS = 12;

export const REFRESH_TOKEN_BYTES = 40;
export const VERIFICATION_TOKEN_BYTES = 32;
