import { db, withTransaction } from "@/config/database";
import {
  GoogleAuthError,
  type GoogleProfile,
} from "@/features/auth/services/googleVerifier.service";
import { createDefaultList } from "@/features/lists/services/list.service";
import { EMAIL_EXISTS_CODE } from "@nearcommerce/api";

export interface GoogleUser {
  id: string;
  role: string;
  is_suspended: boolean;
}

const EMAIL_EXISTS = () =>
  new GoogleAuthError(
    409,
    "An account with this email already exists. Log in with your email and password instead.",
    EMAIL_EXISTS_CODE,
  );

// Names come from the Google profile; fall back to the part of the email before the @.
function displayName(profile: GoogleProfile): string {
  const raw = (profile.name ?? "").trim() || profile.email.split("@")[0];
  const name = raw.slice(0, 100);
  return name.length >= 2 ? name : "Google user";
}

// Finds the account for a verified Google sign-in, or creates one.
//
//  - An account already linked to this Google id signs in.
//  - Otherwise, if the email belongs to an existing account, nothing is linked and the person
//    is told to use their password. Email verification is switched off for password sign-ups,
//    so a password account's email was never proven; silently attaching a Google login to it
//    would let someone who registered a victim's address first keep access after the victim
//    signs in with Google.
//  - Otherwise a new account is created: no password, email marked verified (Google verified
//    it), and a shopper gets their starting list just like a password sign-up.
export async function signInWithGoogle(
  profile: GoogleProfile,
  role: "CUSTOMER" | "STORE_OWNER",
): Promise<{ user: GoogleUser; isNewUser: boolean }> {
  if (!profile.emailVerified)
    throw new GoogleAuthError(
      401,
      "Your Google email address is not verified.",
      "GOOGLE_EMAIL_UNVERIFIED",
    );

  const linked = await db.query(
    `SELECT u.id, u.role, u.is_suspended
       FROM auth_identities i
       JOIN users u ON u.id = i.user_id
      WHERE i.provider = 'google' AND i.provider_subject = $1`,
    [profile.subject],
  );
  if (linked.rows[0]) return { user: linked.rows[0], isNewUser: false };

  const sameEmail = await db.query(`SELECT 1 FROM users WHERE email = $1`, [
    profile.email,
  ]);
  if (sameEmail.rows.length > 0) throw EMAIL_EXISTS();

  try {
    const user = await withTransaction(async (client) => {
      const name = displayName(profile);
      const created = await client.query(
        `INSERT INTO users (email, password_hash, full_name, role, email_verified_at)
         VALUES ($1, NULL, $2, $3, NOW())
         RETURNING id, role, is_suspended`,
        [profile.email, name, role],
      );
      const row = created.rows[0] as GoogleUser;
      if (role === "CUSTOMER") await createDefaultList(client, row.id, name);
      await client.query(
        `INSERT INTO auth_identities (user_id, provider, provider_subject, email)
         VALUES ($1, 'google', $2, $3)`,
        [row.id, profile.subject, profile.email],
      );
      return row;
    });
    return { user, isNewUser: true };
  } catch (error) {
    // Two sign-ins for the same new address at once: the second finds the first's account.
    if ((error as { code?: string } | null)?.code === "23505")
      throw EMAIL_EXISTS();
    throw error;
  }
}
