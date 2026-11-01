import { ENV_PATH } from "@/constants";
import dotenv from "dotenv";
import path from "path";
import { Pool } from "pg";

dotenv.config({ path: ENV_PATH });
if (!process.env.DATABASE_URL)
  dotenv.config({ path: path.resolve(process.cwd(), ".env") });

let connectionString = process.env.DATABASE_URL?.trim() || "";

if (!connectionString)
  throw new Error(
    "DATABASE_URL is missing. Set it before starting the app/tests.",
  );

if (
  connectionString.includes("sslmode=require") &&
  !connectionString.includes("uselibpqcompat")
)
  connectionString = connectionString.replace(
    "sslmode=require",
    "sslmode=require&uselibpqcompat=true",
  );

export const db = new Pool({
  connectionString,
});

// Runs `fn` on one connection inside a transaction: committed when it returns, rolled back
// when it throws.
export async function withTransaction<T>(
  fn: (client: import("pg").PoolClient) => Promise<T>,
): Promise<T> {
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
