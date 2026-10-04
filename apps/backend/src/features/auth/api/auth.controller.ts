import { db } from "@/config/database";
import {
  BCRYPT_SALT_ROUNDS,
  EMAIL_VERIFICATION_TOKEN_TTL_MS,
  PASSWORD_RESET_TOKEN_TTL_MS,
} from "@/constants";
import {
  SessionError,
  issueSession,
  ownerStoreId,
  primeSuspensionCache,
  revokeSession,
  rotateSession,
} from "@/features/auth/services/session.service";
import { generateVerificationToken } from "@/features/auth/utils/crypto";
import { sendPasswordResetEmail } from "@/utils/email";
import {
  ForgotPasswordSchema,
  LoginSchema,
  LogoutSchema,
  RefreshTokenSchema,
  RegisterSchema,
  ResetPasswordSchema,
} from "@nearcommerce/api";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { Request, Response } from "express";
import { ZodError } from "zod";

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

    // 4. Start Database Transaction using a dedicated pool client
    const client = await db.connect();
    try {
      await client.query("BEGIN");
      const userResult = await client.query(
        `INSERT INTO users (email, password_hash, full_name, role) 
         VALUES ($1, $2, $3, 'CUSTOMER') RETURNING id`,
        [validatedData.email, passwordHash, validatedData.full_name],
      );
      const userId = userResult.rows[0].id;

      // 5. Manage Verification Tokens
      await client.query(
        `DELETE FROM email_verification_tokens WHERE user_id = $1`,
        [userId],
      );
      const { rawToken, tokenHash } = generateVerificationToken();
      const expiresAt = new Date(Date.now() + EMAIL_VERIFICATION_TOKEN_TTL_MS);

      await client.query(
        `INSERT INTO email_verification_tokens (user_id, token_hash, expires_at) 
         VALUES ($1, $2, $3)`,
        [userId, tokenHash, expiresAt],
      );

      await client.query("COMMIT");

      // 6. Mark email as verified immediately (MVP without verification)
      await client.query(
        `UPDATE users SET email_verified_at = NOW() WHERE id = $1`,
        [userId],
      );

      // 7. Return success – account is ready to use immediately
      return res.status(201).json({
        message:
          "User registered successfully. Email verification is disabled in the MVP.",
      });
    } catch (txError) {
      await client.query("ROLLBACK");
      throw txError;
    } finally {
      client.release();
    }
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

export const verifyEmail = async (_req: Request, res: Response) => {
  // Email verification is disabled for MVP — always returns success
  return res
    .status(200)
    .json({ message: "Email verification is disabled in the MVP." });
};

export const resendVerification = async (_req: Request, res: Response) => {
  // Email verification is disabled for MVP — always returns success
  return res
    .status(200)
    .json({ message: "Email verification is disabled in the MVP." });
};

export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = ForgotPasswordSchema.parse(req.body);

    const userResult = await db.query(`SELECT id FROM users WHERE email = $1`, [
      email,
    ]);

    // Prevent email enumeration
    if (userResult.rows.length === 0)
      return res.status(200).json({
        message: "If that email is registered, a reset link has been sent.",
      });

    const userId = userResult.rows[0].id;
    const { rawToken, tokenHash } = generateVerificationToken();
    const expiresAt = new Date(Date.now() + PASSWORD_RESET_TOKEN_TTL_MS);

    const client = await db.connect();
    try {
      await client.query("BEGIN");

      // Invalidate prior unexpired tokens
      await client.query(
        `DELETE FROM password_reset_tokens WHERE user_id = $1`,
        [userId],
      );

      // Store new hashed token
      await client.query(
        `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)`,
        [userId, tokenHash, expiresAt],
      );

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }

    await sendPasswordResetEmail(email, rawToken).catch((err) => {
      console.error("[EMAIL DISPATCH ERROR] Password reset email failed:", err);
    });

    if (process.env.NODE_ENV !== "test")
      console.log(
        `[EMAIL DISPATCH] Password Reset To: ${email}, Token: ${rawToken}`,
      );
    return res.status(200).json({
      message: "If that email is registered, a reset link has been sent.",
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return res
        .status(400)
        .json({ error: "Validation failed", details: error.issues });
    }
    if (error instanceof Error && error.name === "ZodError") {
      return res.status(400).json({
        error: "Validation failed",
        details: JSON.parse(error.message),
      });
    }
    console.error("Forgot password error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { token, new_password } = ResetPasswordSchema.parse(req.body);
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    const client = await db.connect();
    try {
      await client.query("BEGIN");

      // Find valid token
      const tokenResult = await client.query(
        `SELECT user_id FROM password_reset_tokens WHERE token_hash = $1 AND expires_at > NOW()`,
        [tokenHash],
      );

      if (tokenResult.rows.length === 0) {
        await client.query("ROLLBACK");
        return res
          .status(400)
          .json({ error: "Invalid or expired reset token" });
      }

      const userId = tokenResult.rows[0].user_id;
      const saltRounds = BCRYPT_SALT_ROUNDS;
      const passwordHash = await bcrypt.hash(new_password, saltRounds);

      // Update password
      await client.query(`UPDATE users SET password_hash = $1 WHERE id = $2`, [
        passwordHash,
        userId,
      ]);

      // Revoke all active user sessions
      await client.query(`DELETE FROM user_sessions WHERE user_id = $1`, [
        userId,
      ]);

      // Delete the used reset token
      await client.query(
        `DELETE FROM password_reset_tokens WHERE user_id = $1`,
        [userId],
      );

      await client.query("COMMIT");
      return res
        .status(200)
        .json({ message: "Password has been successfully reset." });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    if (error instanceof ZodError) {
      return res
        .status(400)
        .json({ error: "Validation failed", details: error.issues });
    }
    if (error instanceof Error && error.name === "ZodError") {
      return res.status(400).json({
        error: "Validation failed",
        details: JSON.parse(error.message),
      });
    }
    console.error("Reset password error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const loginUser = async (req: Request, res: Response) => {
  try {
    const { email, password } = LoginSchema.parse(req.body);

    const userResult = await db.query(
      `SELECT id, password_hash, role, is_suspended FROM users WHERE email = $1`,
      [email],
    );

    if (userResult.rows.length === 0)
      return res.status(401).json({ error: "Invalid credentials" });
    const user = userResult.rows[0];

    // Check if account is suspended right at login
    if (user.is_suspended)
      return res.status(403).json({ error: "Account is suspended." });

    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword)
      return res.status(401).json({ error: "Invalid credentials" });

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
