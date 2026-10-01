import type { Server as HttpServer } from "node:http";
import { Server } from "socket.io";

export function attachSockets(
  httpServer: HttpServer,
  frontendOrigin: string,
): Server {
  const io = new Server(httpServer, {
    cors: { origin: frontendOrigin, methods: ["GET", "POST"] },
  });

  io.on("connection", (socket) => {
    console.info(`Socket connected: ${socket.id}`);
    socket.on("disconnect", () =>
      console.info(`Socket disconnected: ${socket.id}`),
    );
  });

  return io;
}
