import { ENV_PATH } from "@/constants";
import { createAdapter } from "@socket.io/redis-adapter";
import dotenv from "dotenv";
import { Server as HttpServer } from "http";
import path from "path";
import { createClient } from "redis";
import { Server } from "socket.io";

dotenv.config({ path: ENV_PATH });
if (!process.env.REDIS_URL)
  dotenv.config({ path: path.resolve(process.cwd(), ".env") });

let io: Server;

export const initSocketServer = async (
  httpServer: HttpServer,
): Promise<Server> => {
  io = new Server(httpServer, {
    cors: {
      // Adjust to your frontend origin(s) in production (e.g. process.env.CLIENT_ORIGIN)
      origin: "*",
    },
  });

  // Two separate Redis clients are required by the pub/sub adapter:
  // one to publish and one to subscribe (Redis protocol constraint).
  const pubClient = createClient({ url: process.env.REDIS_URL });
  const subClient = pubClient.duplicate();

  pubClient.on("error", (err) => console.error("[REDIS pub]", err));
  subClient.on("error", (err) => console.error("[REDIS sub]", err));

  await Promise.all([pubClient.connect(), subClient.connect()]);
  console.log("[SOCKET] Redis adapter connected");

  io.adapter(createAdapter(pubClient, subClient));

  io.on("connection", (socket) => {
    console.log(`[SOCKET] Client connected: ${socket.id}`);

    // Clients call this event to subscribe to a specific household list room.
    // Only members who have joined the room will receive real-time updates.
    socket.on("join_list", (listId: string) => {
      socket.join(`list:${listId}`);
      console.log(`[SOCKET] ${socket.id} joined list:${listId}`);
    });

    socket.on("leave_list", (listId: string) => {
      socket.leave(`list:${listId}`);
    });

    socket.on("disconnect", () => {
      console.log(`[SOCKET] Client disconnected: ${socket.id}`);
    });
  });

  return io;
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
