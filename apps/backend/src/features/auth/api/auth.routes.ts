import {
  forgotPassword,
  loginUser,
  logoutUser,
  refreshSession,
  registerUser,
  resetPassword,
} from "@/features/auth/api/auth.controller";
import { googleLogin } from "@/features/auth/api/google.controller";
import {
  forgotPasswordLimiter,
  googleAuthLimiter,
  refreshLimiter,
  registerLimiter,
} from "@/middleware/rateLimiter";
import { Router } from "express";

const authRouter = Router();

authRouter.post("/register", registerLimiter, registerUser);
authRouter.post("/login", loginUser);
authRouter.post("/google", googleAuthLimiter, googleLogin);
authRouter.post("/refresh", refreshLimiter, refreshSession);
authRouter.post("/logout", logoutUser);
// Email verification and password reset are switched off on this mock application.
// Handlers return 501 / are disabled.
authRouter.post("/forgot-password", forgotPasswordLimiter, forgotPassword);
authRouter.post("/reset-password", resetPassword);

export default authRouter;
