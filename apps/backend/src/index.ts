import { app } from "@/app";
import { db } from "@/config/database";
import redisClient, { connectRedis } from "@/config/redis";
import { initSocketServer } from "@/config/socket";
import { DEFAULT_PORT, ENV_PATH } from "@/constants";
import { ensureDefaultCatalog } from "@/features/catalog/services/category.service";
import dotenv from "dotenv";
import http from "http";
import path from "path";

dotenv.config({ path: ENV_PATH });
if (!process.env.DATABASE_URL)
  dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const PORT = process.env.PORT || DEFAULT_PORT;

// Wrap Express in a plain HTTP server so Socket.io can share the same port.
const httpServer = http.createServer(app);

(async () => {
  await connectRedis();
  await initSocketServer(httpServer);

  try {
    const seeded = await ensureDefaultCatalog();
    if (seeded)
      console.log(
        `📚 Default catalog created: ${seeded.categoriesCreated} categories, ${seeded.subcategoriesCreated} subcategories`,
      );
  } catch (err) {
    console.error("Could not create the default catalog:", err);
  }

  httpServer.listen(PORT, () => {
    console.log(`🚀 Near Commerce Backend running on http://localhost:${PORT}`);
    console.log(`🔌 Socket.io listening on ws://localhost:${PORT}`);
  });
})();

const SHUTDOWN_TIMEOUT_MS = 10_000;
let shuttingDown = false;

async function shutdown(signal: string, exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`${signal} received, shutting down...`);
  const forceExit = setTimeout(() => {
    console.error("Shutdown timed out, forcing exit");
    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS);
  forceExit.unref();
  try {
    await new Promise<void>((resolve) => httpServer.close(() => resolve()));
    await db.end();
    if (redisClient.isOpen) await redisClient.quit();
    process.exit(exitCode);
  } catch (err) {
    console.error("Error during shutdown:", err);
    process.exit(1);
  }
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("unhandledRejection", (reason) => {
  console.error("Unhandled promise rejection:", reason);
});
process.on("uncaughtException", (err) => {
  console.error("Uncaught exception:", err);
  void shutdown("uncaughtException", 1);
});
