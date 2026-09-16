import {
  registerUser,
  resendVerification,
  verifyEmail,
} from "@/features/auth/api/auth.controller";
import { resendVerificationLimiter } from "@/middleware/rateLimiter";
import { Router } from "express";

const authRouter = Router();

authRouter.post("/register", registerUser);
authRouter.post("/verify-email", verifyEmail);
authRouter.post(
  "/resend-verification",
  resendVerificationLimiter,
  resendVerification,
);

export default authRouter;
