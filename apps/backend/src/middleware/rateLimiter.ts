import {
  JOIN_LIST_RATE_LIMIT_MAX,
  RATE_LIMIT_MAX_REQUESTS,
  RATE_LIMIT_WINDOW_MINUTES,
  RATE_LIMIT_WINDOW_MS,
  REFRESH_RATE_LIMIT_MAX,
  REGISTER_RATE_LIMIT_MAX,
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

// Invite codes are short, so slow down anyone trying to guess them.
export const joinListLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: JOIN_LIST_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Too many join attempts, please try again later.",
  },
});

// Refresh happens in the background roughly every 15 minutes per client, so allow far
// more than the password endpoints while still capping token-guessing.
export const refreshLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: REFRESH_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Too many refresh attempts, please try again later.",
  },
});

// Registration is limited per IP so one client cannot mass-create accounts.
export const registerLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: REGISTER_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === "test",
  message: {
    error: "Too many registration attempts, please try again later.",
  },
});
