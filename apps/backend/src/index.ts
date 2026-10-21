import { app } from "@/app";
import { connectRedis } from "@/config/redis";
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
