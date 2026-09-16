import { ENV_PATH } from "@/constants";
import dotenv from "dotenv";
import path from "path";
import { createClient } from "redis";

dotenv.config({ path: ENV_PATH });
if (!process.env.REDIS_URL)
  dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const redisClient = createClient({ url: process.env.REDIS_URL });

redisClient.on("error", (err) => console.error("[REDIS] Client Error", err));

export const connectRedis = async () => {
  if (!redisClient.isOpen) {
    await redisClient.connect();
    console.log("[REDIS] Connected for caching");
  }
};

export default redisClient;
