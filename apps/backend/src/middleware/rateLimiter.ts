import {
  RATE_LIMIT_MAX_REQUESTS,
  RATE_LIMIT_WINDOW_MINUTES,
  RATE_LIMIT_WINDOW_MS,
  RESEND_RATE_LIMIT_MAX_REQUESTS,
} from "@/constants";
import rateLimit from "express-rate-limit";

// Strict limiter for password resets / registration to prevent spam & enumeration
export const dataLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: RATE_LIMIT_MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: `Too many requests from this IP, please try again after ${RATE_LIMIT_WINDOW_MINUTES} minutes`,
  },
});

export const resendVerificationLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: RESEND_RATE_LIMIT_MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Too many resend requests, please try again later.",
  },
});

export const forgotPasswordLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: RATE_LIMIT_MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Too many password reset requests, please try again later.",
  },
});
