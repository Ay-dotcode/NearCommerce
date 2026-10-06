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

async function seedAdmin() {
  console.log("Seeding system admin users...");

  const adminUsers = [
    {
      email: "joseyowolabi@gmail.com",
      fullName: "Joseph Owolabi",
      password: "Password12++",
    },
    {
      email: "admin@nearcommerce.com",
      fullName: "System Admin",
      password: "Password12++",
    },
  ];

  for (const admin of adminUsers) {
    const passwordHash = await bcrypt.hash(admin.password, 12);
    const result = await pool.query(
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

  await pool.end();
  console.log("Admin seeding completed successfully!");
}

seedAdmin().catch((err) => {
  console.error("Admin seeding failed:", err);
  pool.end();
  process.exit(1);
});
