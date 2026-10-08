import { db } from "@/config/database";
import { EMAIL_VERIFICATION_TOKEN_TTL_MS } from "@/constants";
import { generateVerificationToken } from "@/features/auth/utils/crypto";
import { sendVerificationEmail } from "@/utils/email";
import crypto from "crypto";

// Replaces any earlier token for the user with a fresh one and emails the link. Email
// delivery failures are logged, never thrown: a user who did not get the email can request
// another, and registration must not fail because SMTP is down.
export async function issueEmailVerification(
  userId: string,
  email: string,
): Promise<void> {
  const { rawToken, tokenHash } = generateVerificationToken();
  const expiresAt = new Date(Date.now() + EMAIL_VERIFICATION_TOKEN_TTL_MS);

  const client = await db.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      `DELETE FROM email_verification_tokens WHERE user_id = $1`,
      [userId],
    );
    await client.query(
      `INSERT INTO email_verification_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, $3)`,
      [userId, tokenHash, expiresAt],
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  // Handy without SMTP, but a raw token in production logs would let anyone with log access
  // verify arbitrary accounts.
  if (!["test", "production"].includes(process.env.NODE_ENV ?? ""))
    console.log(
      `[EMAIL DISPATCH] Verification To: ${email}, Token: ${rawToken}`,
    );

  try {
    await sendVerificationEmail(email, rawToken);
  } catch (error) {
    console.error("[AUTH] Failed to send verification email:", error);
  }
}

// Marks the account behind a valid, unexpired token as verified and burns its tokens.
// Returns false for unknown or expired tokens.
export async function confirmEmailVerification(
  token: string,
): Promise<boolean> {
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const found = await client.query(
      `SELECT user_id FROM email_verification_tokens
        WHERE token_hash = $1 AND expires_at > NOW()`,
      [tokenHash],
    );
    if (found.rows.length === 0) {
      await client.query("ROLLBACK");
      return false;
    }

    const userId = found.rows[0].user_id;
    await client.query(
      `UPDATE users SET email_verified_at = COALESCE(email_verified_at, NOW())
        WHERE id = $1`,
      [userId],
    );
    await client.query(
      `DELETE FROM email_verification_tokens WHERE user_id = $1`,
      [userId],
    );
    await client.query("COMMIT");
    return true;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
