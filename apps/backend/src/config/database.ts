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
