import { ENV_PATH } from "@/constants";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
import path from "path";
import { Pool } from "pg";

dotenv.config({ path: ENV_PATH });
if (!process.env.DATABASE_URL)
  dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function seedAdmin(poolInstance?: Pool) {
  const activePool = poolInstance || pool;
  console.log("Seeding system admin users...");

  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (process.env.NODE_ENV === "production" && (!email || !password))
    throw new Error(
      "Set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD to seed an admin in production.",
    );

  const adminUsers = [
    {
      email: email,
      fullName: "System Admin",
      password: password ?? "Password12++",
    },
  ];

  for (const admin of adminUsers) {
    const passwordHash = await bcrypt.hash(admin.password, 12);
    const result = await activePool.query(
      `INSERT INTO users (email, password_hash, full_name, role, email_verified_at, is_suspended)
       VALUES ($1, $2, $3, 'SYSTEM_ADMIN', NOW(), false)
       ON CONFLICT (email) DO UPDATE 
       SET password_hash = EXCLUDED.password_hash,
           role = 'SYSTEM_ADMIN',
           email_verified_at = NOW(),
           is_suspended = false
       RETURNING id, email, role, full_name`,
      [admin.email, passwordHash, admin.fullName],
    );
    console.log("Seeded admin user:", result.rows[0]);
  }

  if (!poolInstance) {
    await pool.end();
  }
  console.log("Admin seeding completed successfully!");
}

if (require.main === module) {
  seedAdmin().catch((err) => {
    console.error("Admin seeding failed:", err);
    pool.end();
    process.exit(1);
  });
}
