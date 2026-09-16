import { ENV_PATH } from "@/constants";
import dotenv from "dotenv";
import path from "path";
import { Pool } from "pg";

dotenv.config({ path: ENV_PATH });
if (!process.env.DATABASE_URL)
  dotenv.config({ path: path.resolve(process.cwd(), ".env") });

export const db = new Pool({
  connectionString: process.env.DATABASE_URL,
});
