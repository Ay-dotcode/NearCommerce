import { BCRYPT_SALT_ROUNDS, ENV_PATH } from "@/constants";
import { RegisterSchema } from "@nearcommerce/api";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
import path from "path";
import { Pool } from "pg";
import readline from "readline";

dotenv.config({ path: ENV_PATH });
if (!process.env.DATABASE_URL)
  dotenv.config({ path: path.resolve(process.cwd(), ".env") });

// Creates a SYSTEM_ADMIN, or promotes the account that already has that email.
//
//   pnpm add-admin <email> <password> [full name]
//
// Admins created here are "root" admins: admins that were only promoted from the admin portal
// cannot demote, suspend or delete them. Run it on the server (it needs DATABASE_URL).

export interface AddAdminResult {
  id: string;
  email: string;
  created: boolean;
}

export async function addAdmin(
  pool: Pick<Pool, "query">,
  input: { email: string; password: string; fullName?: string },
): Promise<AddAdminResult> {
  // Reuse the registration rules so the same email / password limits apply.
  const parsed = RegisterSchema.pick({ email: true, password: true }).safeParse({
    email: input.email,
    password: input.password,
  });
  if (!parsed.success)
    throw new Error(parsed.error.issues.map((i) => i.message).join("; "));
  const { email, password } = parsed.data;
  const fullName = input.fullName?.trim() || "System Admin";
  if (fullName.length < 2 || fullName.length > 100)
    throw new Error("Full name must be between 2 and 100 characters");

  const passwordHash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
  const existing = await pool.query("SELECT id FROM users WHERE email = $1", [
    email,
  ]);

  // An existing account keeps its name and data; it is promoted and gets the new password.
  const { rows } = await pool.query(
    `INSERT INTO users (email, password_hash, full_name, role, email_verified_at, is_suspended, is_root_admin)
     VALUES ($1, $2, $3, 'SYSTEM_ADMIN', NOW(), false, true)
     ON CONFLICT (email) DO UPDATE
       SET password_hash = EXCLUDED.password_hash,
           role = 'SYSTEM_ADMIN',
           is_root_admin = true,
           is_suspended = false,
           email_verified_at = COALESCE(users.email_verified_at, NOW()),
           updated_at = CURRENT_TIMESTAMP
     RETURNING id, email`,
    [email, passwordHash, fullName],
  );
  // Make the account sign in again so its old tokens (and role) are not reused.
  if (existing.rows.length)
    await pool.query("DELETE FROM user_sessions WHERE user_id = $1", [
      rows[0].id,
    ]);
  return { id: rows[0].id, email: rows[0].email, created: !existing.rows.length };
}

// Asks for the password without echoing it, so it stays out of shell history.
function promptHidden(question: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: true,
    });
    const out = rl as unknown as {
      _writeToOutput: (text: string) => void;
    };
    let muted = false;
    out._writeToOutput = (text: string) => {
      if (!muted) process.stdout.write(text);
    };
    rl.question(question, (answer) => {
      rl.close();
      process.stdout.write("\n");
      resolve(answer);
    });
    muted = true;
  });
}

async function main() {
  const [email, passwordArg, ...nameParts] = process.argv
    .slice(2)
    .filter((arg) => arg !== "--");
  if (!email) {
    console.error("Usage: pnpm add-admin <email> <password> [full name]");
    process.exit(1);
  }
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set. Add it to the .env file in the repo root.");
    process.exit(1);
  }
  const password =
    passwordArg ?? (process.stdin.isTTY ? await promptHidden("Password: ") : "");

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const result = await addAdmin(pool, {
      email,
      password,
      fullName: nameParts.join(" "),
    });
    console.log(
      result.created
        ? `✅ Created admin ${result.email}`
        : `✅ ${result.email} already existed: promoted to admin and password updated`,
    );
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "42703"
    )
      console.error("❌ The database is out of date. Run: pnpm --filter @nearcommerce/backend db:migrate");
    else console.error("❌", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

if (require.main === module) void main();
