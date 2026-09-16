import { db } from "@/config/database";
import {
  BCRYPT_SALT_ROUNDS,
  EMAIL_VERIFICATION_TOKEN_TTL_MS,
} from "@/constants";
import { generateVerificationToken } from "@/features/auth/utils/crypto";
import { RegisterSchema } from "@nearcommerce/api";
import bcrypt from "bcrypt";
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
