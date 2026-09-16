import { app } from "@/app";
import { connectRedis } from "@/config/redis";
import { initSocketServer } from "@/config/socket";
import { DEFAULT_PORT, ENV_PATH } from "@/constants";
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

  httpServer.listen(PORT, () => {
    console.log(`🚀 NearCommerce Backend running on http://localhost:${PORT}`);
    console.log(`➡️Test Database:GEThttp://localhost:${PORT}/test-db`);
    console.log(`➡️Test Schema:POST http://localhost:${PORT}/test-valid`);
    console.log(`➡️Register: POST http://localhost:${PORT}/auth/register`);
    console.log(
      `➡️Add List Item:POST http://localhost:${PORT}/lists/:list_id/items`,
    );
    console.log(
      `➡️Regenerate Invite: POST http://localhost:${PORT}/lists/:list_id/regenerate-invite`,
    );
    console.log(`🔌 Socket.io listening on ws://localhost:${PORT}`);
  });
})();
