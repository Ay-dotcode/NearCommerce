import { ENV_PATH } from "@/constants";
import { registerListSocketHandlers } from "@/features/lists/socket/list.socket";
import { createAdapter } from "@socket.io/redis-adapter";
import dotenv from "dotenv";
import { Server as HttpServer } from "http";
import path from "path";
import { createClient } from "redis";
import { Server } from "socket.io";

dotenv.config({ path: ENV_PATH });
if (!process.env.REDIS_URL)
  dotenv.config({ path: path.resolve(process.cwd(), ".env") });

let io: Server | undefined;

/**
 * Creates the Socket.io server with authentication and list handlers, without any
 * Redis dependency. Used directly by tests; production goes through initSocketServer.
 */
export const createSocketServer = (httpServer: HttpServer): Server => {
  io = new Server(httpServer, {
    cors: {
      origin: "*",
    },
  });
  registerListSocketHandlers(io);
  return io;
};

export const initSocketServer = async (
  httpServer: HttpServer,
): Promise<Server> => {
  const server = createSocketServer(httpServer);

  // Two separate Redis clients are required by the pub/sub adapter:
  // one to publish and one to subscribe (Redis protocol constraint).
  const pubClient = createClient({ url: process.env.REDIS_URL });
  const subClient = pubClient.duplicate();

  pubClient.on("error", (err) => console.error("[REDIS pub]", err));
  subClient.on("error", (err) => console.error("[REDIS sub]", err));

  await Promise.all([pubClient.connect(), subClient.connect()]);
  console.log("[SOCKET] Redis adapter connected");

  server.adapter(createAdapter(pubClient, subClient));
  return server;
};

/**
 * Returns the initialized Socket.io server instance.
 * Must be called after `initSocketServer` has resolved.
 */
export const getIO = (): Server => {
  if (!io)
    throw new Error(
      "[SOCKET] Socket.io has not been initialized. Call initSocketServer first.",
    );
  return io;
};
