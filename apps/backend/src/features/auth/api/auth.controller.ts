import { db } from "@/config/database";
import redisClient from "@/config/redis";
import {
  BCRYPT_SALT_ROUNDS,
  EMAIL_VERIFICATION_TOKEN_TTL_MS,
  PASSWORD_RESET_TOKEN_TTL_MS,
} from "@/constants";
import { generateVerificationToken } from "@/features/auth/utils/crypto";
import {
  ForgotPasswordSchema,
  LoginSchema,
  RegisterSchema,
  ResendVerificationSchema,
  ResetPasswordSchema,
  VerifyEmailSchema,
} from "@nearcommerce/api";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { Request, Response } from "express";
import jwt from "jsonwebtoken";
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

      // 6. Dispatch Email
      // TODO: Replace mocked console.log with an actual email service implementation (e.g. Resend, SendGrid, AWS SES)
      console.log(
        `[EMAIL DISPATCH] To: ${validatedData.email}, Token: ${rawToken}`,
      );

      // 7. Return success (DO NOT return the raw token in the JSON response)
      return res.status(201).json({
        message:
          "User registered successfully. Please check your email to verify your account.",
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

export const verifyEmail = async (req: Request, res: Response) => {
  let validatedData;
  try {
    validatedData = VerifyEmailSchema.parse(req.body);
  } catch (error) {
    if (error instanceof ZodError) {
      return res
        .status(400)
        .json({ error: "Validation failed", details: error.issues });
    }
    return res.status(400).json({ error: "Validation failed" });
  }

  try {
    const tokenHash = crypto
      .createHash("sha256")
      .update(validatedData.token)
      .digest("hex");

    const client = await db.connect();
    try {
      await client.query("BEGIN");

      const tokenResult = await client.query(
        `SELECT user_id FROM email_verification_tokens 
         WHERE token_hash = $1 AND expires_at > NOW()`,
        [tokenHash],
      );

      if (tokenResult.rows.length === 0) {
        await client.query("ROLLBACK");
        return res
          .status(400)
          .json({ error: "Invalid or expired verification token" });
      }

      const userId = tokenResult.rows[0].user_id;

      await client.query(
        `UPDATE users SET email_verified_at = NOW() WHERE id = $1`,
        [userId],
      );

      await client.query(
        `DELETE FROM email_verification_tokens WHERE user_id = $1`,
        [userId],
      );

      await client.query("COMMIT");
      return res.status(200).json({ message: "Email verified successfully" });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Verification error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const resendVerification = async (req: Request, res: Response) => {
  let validatedData;
  try {
    validatedData = ResendVerificationSchema.parse(req.body);
  } catch (error) {
    if (error instanceof ZodError)
      return res
        .status(400)
        .json({ error: "Validation failed", details: error.issues });
    return res.status(400).json({ error: "Validation failed" });
  }

  try {
    const userResult = await db.query(
      `SELECT id, email_verified_at FROM users WHERE email = $1`,
      [validatedData.email],
    );

    if (userResult.rows.length === 0)
      // Return 200 to prevent email enumeration attacks
      return res.status(200).json({
        message: "If your email is registered, a new token has been sent.",
      });

    const user = userResult.rows[0];

    if (user.email_verified_at)
      return res.status(400).json({ error: "Email is already verified" });

    const { rawToken, tokenHash } = generateVerificationToken();
    const expiresAt = new Date(Date.now() + EMAIL_VERIFICATION_TOKEN_TTL_MS);

    const client = await db.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        `DELETE FROM email_verification_tokens WHERE user_id = $1`,
        [user.id],
      );
      await client.query(
        `INSERT INTO email_verification_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)`,
        [user.id, tokenHash, expiresAt],
      );
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }

    // Dispatch Email (Mocked)
    console.log(
      `[EMAIL DISPATCH] Resend To: ${validatedData.email}, Token: ${rawToken}`,
    );

    return res.status(200).json({
      message: "If your email is registered, a new token has been sent.",
    });
  } catch (error) {
    console.error("Resend verification error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
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

const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || "fallback_secret";
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "fallback_refresh";

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

    // Generate Tokens
    const accessToken = jwt.sign(
      { id: user.id, role: user.role },
      JWT_ACCESS_SECRET,
      { expiresIn: "15m" },
    );

    // Generate a secure random string for the refresh token, hash it for the DB
    const rawRefreshToken = crypto.randomBytes(40).toString("hex");
    const refreshTokenHash = crypto
      .createHash("sha256")
      .update(rawRefreshToken)
      .digest("hex");

    const refreshExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await db.query(
      `INSERT INTO user_sessions (user_id, refresh_token_hash, expires_at) VALUES ($1, $2, $3)`,
      [user.id, refreshTokenHash, refreshExpiresAt],
    );

    // Prime the Redis cache for the middleware suspension check
    try {
      if (redisClient.isOpen)
        await redisClient.set(`suspended:${user.id}`, "false", { EX: 60 * 15 }); // Match access token expiry
    } catch (redisError) {
      console.error(
        "[AUTH] Failed to prime redis suspension cache:",
        redisError,
      );
    }

    return res.status(200).json({
      access_token: accessToken,
      refresh_token: rawRefreshToken, // Send raw token to client once, never again
      user: { id: user.id, role: user.role },
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
