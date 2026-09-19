import { ENV_PATH } from "@/constants";
import dotenv from "dotenv";
import path from "path";
import { Pool } from "pg";

dotenv.config({ path: ENV_PATH });
if (!process.env.DATABASE_URL)
  dotenv.config({ path: path.resolve(process.cwd(), ".env") });

let connectionString = process.env.DATABASE_URL || "";

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
