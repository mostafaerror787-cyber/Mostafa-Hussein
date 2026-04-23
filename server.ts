import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";
import path from "path";

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
    },
  });

  const PORT = 3000;

  // Game State (Snakes and Ladders Lobby)
  const users = new Map();

  io.on("connection", (socket) => {
    console.log(`[SOCKET] User connected: ${socket.id}`);

    // Basic user info
    const user = {
      id: socket.id,
      name: `Guest ${socket.id.slice(0, 4)}`,
    };
    users.set(socket.id, user);

    // Notify about active users
    io.emit("users:update", Array.from(users.values()));

    // Handle disconnect
    socket.on("disconnect", () => {
      console.log(`[SOCKET] User disconnected: ${socket.id}`);
      users.delete(socket.id);
      io.emit("users:update", Array.from(users.values()));
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`[SERVER] Snakes and Ladders running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
