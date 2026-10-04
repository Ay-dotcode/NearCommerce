import {
  forgotPassword,
  loginUser,
  logoutUser,
  refreshSession,
  registerUser,
  resendVerification,
  resetPassword,
  verifyEmail,
} from "@/features/auth/api/auth.controller";
import {
  forgotPasswordLimiter,
  refreshLimiter,
  resendVerificationLimiter,
} from "@/middleware/rateLimiter";
import { Router } from "express";

const authRouter = Router();

authRouter.post("/register", registerUser);
authRouter.post("/login", loginUser);
authRouter.post("/refresh", refreshLimiter, refreshSession);
authRouter.post("/logout", logoutUser);
authRouter.post("/verify-email", verifyEmail);
authRouter.post(
  "/resend-verification",
  resendVerificationLimiter,
  resendVerification,
);
authRouter.post("/forgot-password", forgotPasswordLimiter, forgotPassword);
authRouter.post("/reset-password", resetPassword);

export default authRouter;
