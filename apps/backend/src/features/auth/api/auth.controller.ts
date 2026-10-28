import { db } from "@/config/database";
import { BCRYPT_SALT_ROUNDS, PASSWORD_RESET_TOKEN_TTL_MS } from "@/constants";
// Email verification and password reset are switched off (see registerUser).
// verifyEmail, resendVerification, forgotPassword and resetPassword handlers are kept
// for interface stability.
import {
  confirmEmailVerification,
  issueEmailVerification,
} from "@/features/auth/services/emailVerification.service";
import {
  clearLoginFailures,
  getLoginLockout,
  recordLoginFailure,
} from "@/features/auth/services/loginLockout.service";
import {
  SessionError,
  issueSession,
  ownerStoreId,
  primeSuspensionCache,
  revokeSession,
  rotateSession,
} from "@/features/auth/services/session.service";
import { generateVerificationToken } from "@/features/auth/utils/crypto";
import {
  ForgotPasswordSchema,
  LoginSchema,
  LogoutSchema,
  RefreshTokenSchema,
  RegisterSchema,
  ResendVerificationSchema,
  ResetPasswordSchema,
  VerifyEmailSchema,
} from "@nearcommerce/api";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { Request, Response } from "express";
import { ZodError } from "zod";

// Compared against when the email is unknown so login timing does not leak which emails exist.
const DUMMY_PASSWORD_HASH = bcrypt.hashSync(
  crypto.randomBytes(16).toString("hex"),
  BCRYPT_SALT_ROUNDS,
);

export const registerUser = async (req: Request, res: Response) => {
  let validatedData;
  try {
    // 1. Validate incoming request
    validatedData = RegisterSchema.parse(req.body);
  } catch (error) {
    if (error instanceof ZodError)
      return res
        .status(400)
        .json({ error: "Validation failed", details: error.issues });
    return res.status(400).json({ error: "Validation failed" });
  }

  try {
    // 2. Check if user already exists
    const existingUser = await db.query(
      `SELECT id FROM users WHERE email = $1`,
      [validatedData.email],
    );
    if (existingUser.rows.length > 0)
      return res.status(409).json({ error: "Email already in use" });

    // 3. Hash password
    const passwordHash = await bcrypt.hash(
      validatedData.password,
      BCRYPT_SALT_ROUNDS,
    );

    // 4. Insert the user. Email verification is switched off, so the account is usable
    //    straight away: email_verified_at is set now and no verification email is sent.
    //    To bring verification back, insert without email_verified_at and call
    //    issueEmailVerification(userId, email) here (see emailVerification.service.ts).
    await db.query(
      `INSERT INTO users (email, password_hash, full_name, role, email_verified_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [
        validatedData.email,
        passwordHash,
        validatedData.full_name,
        validatedData.role,
      ],
    );

    return res.status(201).json({
      message: "Account created. You can log in now.",
    });
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "23505"
    ) {
      return res.status(409).json({ error: "Email already in use" });
    }
    console.error("Registration error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const verifyEmail = async (req: Request, res: Response) => {
  try {
    const { token } = VerifyEmailSchema.parse(req.body);
    if (!(await confirmEmailVerification(token)))
      return res
        .status(400)
        .json({ error: "Invalid or expired verification token" });
    return res.status(200).json({ message: "Email verified successfully." });
  } catch (error) {
    if (error instanceof ZodError)
      return res
        .status(400)
        .json({ error: "Validation failed", details: error.issues });
    console.error("Verify email error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const resendVerification = async (req: Request, res: Response) => {
  // Same answer whether or not the address exists or is already verified, so this cannot
  // be used to probe which emails are registered.
  const generic = {
    message:
      "If that account exists and is not yet verified, a new link has been sent.",
  };
  try {
    const { email } = ResendVerificationSchema.parse(req.body);
    const { rows } = await db.query(
      `SELECT id FROM users WHERE email = $1 AND email_verified_at IS NULL`,
      [email],
    );
    if (rows.length > 0) await issueEmailVerification(rows[0].id, email);
    return res.status(200).json(generic);
  } catch (error) {
    if (error instanceof ZodError)
      return res
        .status(400)
        .json({ error: "Validation failed", details: error.issues });
    console.error("Resend verification error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const forgotPassword = async (req: Request, res: Response) => {
  return res.status(501).json({
    error: "Password reset is disabled on this mock application. Please contact support.",
  });
};

export const resetPassword = async (req: Request, res: Response) => {
  return res.status(501).json({
    error: "Password reset is disabled on this mock application. Please contact support.",
  });
};

export const loginUser = async (req: Request, res: Response) => {
  try {
    const { email, password } = LoginSchema.parse(req.body);

    const ip = req.ip ?? "unknown";

    const lockedFor = await getLoginLockout(email, ip);
    if (lockedFor > 0) {
      res.setHeader("Retry-After", String(lockedFor));
      return res.status(429).json({
        error: `Too many failed login attempts. Try again in ${lockedFor} seconds.`,
      });
    }

    const userResult = await db.query(
      `SELECT id, password_hash, role, is_suspended, email_verified_at FROM users
        WHERE email = $1`,
      [email],
    );

    const user = userResult.rows[0];
    // Always run bcrypt so response time does not reveal whether the email exists.
    const isValidPassword = await bcrypt.compare(
      password,
      user?.password_hash ?? DUMMY_PASSWORD_HASH,
    );
    if (!user || !isValidPassword) {
      await recordLoginFailure(email, ip);
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Only reveal the suspension once the caller has proven they own the account.
    if (user.is_suspended)
      return res
        .status(403)
        .json({ error: "Account is suspended.", code: "ACCOUNT_SUSPENDED" });

    await clearLoginFailures(email, ip);

    const session = await issueSession(user);
    await primeSuspensionCache(user.id);

    const storeId =
      user.role === "STORE_OWNER" ? await ownerStoreId(user.id) : undefined;

    return res.status(200).json({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      user: {
        id: user.id,
        role: user.role,
        email_verified: user.email_verified_at !== null,
        ...(storeId ? { store_id: storeId } : {}),
      },
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return res
        .status(400)
        .json({ error: "Validation failed", details: error.issues });
    }
    if (error instanceof Error && error.name === "ZodError")
      return res.status(400).json({
        error: "Validation failed",
        details: JSON.parse(error.message),
      });
    console.error("Login error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// POST /auth/refresh: rotate the refresh token and issue a new access token.
export const refreshSession = async (req: Request, res: Response) => {
  try {
    const { refresh_token } = RefreshTokenSchema.parse(req.body);
    return res.status(200).json(await rotateSession(refresh_token));
  } catch (error) {
    if (error instanceof ZodError)
      return res
        .status(400)
        .json({ error: "Validation failed", details: error.issues });
    if (error instanceof SessionError)
      return res.status(error.status).json({ error: error.message });
    console.error("Refresh error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// POST /auth/logout: revoke this device's refresh token. Always 204 so it is safe to retry.
export const logoutUser = async (req: Request, res: Response) => {
  try {
    const { refresh_token } = LogoutSchema.parse(req.body);
    await revokeSession(refresh_token);
    return res.status(204).send();
  } catch (error) {
    if (error instanceof ZodError)
      return res
        .status(400)
        .json({ error: "Validation failed", details: error.issues });
    console.error("Logout error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};
