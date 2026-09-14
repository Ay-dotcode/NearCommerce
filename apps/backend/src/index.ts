import express from "express";
import http from "http";
import { Server } from "socket.io";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ status: "healthy", service: "nearcommerce-backend" });
});

io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);
  
  socket.on("join-list", (listId) => {
    socket.join(listId);
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`NearCommerce Backend running on port ${PORT}`);
});
