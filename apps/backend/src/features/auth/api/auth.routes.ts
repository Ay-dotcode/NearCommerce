import {
  forgotPassword,
  registerUser,
  resendVerification,
  resetPassword,
  verifyEmail,
} from "@/features/auth/api/auth.controller";
import {
  forgotPasswordLimiter,
  resendVerificationLimiter,
} from "@/middleware/rateLimiter";
import { Router } from "express";

const authRouter = Router();

authRouter.post("/register", registerUser);
authRouter.post("/verify-email", verifyEmail);
authRouter.post(
  "/resend-verification",
  resendVerificationLimiter,
  resendVerification,
);
authRouter.post("/forgot-password", forgotPasswordLimiter, forgotPassword);
authRouter.post("/reset-password", resetPassword);

export default authRouter;
