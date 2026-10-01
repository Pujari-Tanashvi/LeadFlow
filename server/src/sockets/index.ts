import type { Server as HttpServer } from "node:http";
import { Server } from "socket.io";
import { getAuthenticatedUser } from "../services/userService.js";
import { verifyAccessToken } from "../services/authService.js";

let socketServer: Server | undefined;

export function emitLeadCreated(brokerageId: string, lead: unknown): void {
  socketServer?.to(`brokerage:${brokerageId}`).emit("lead.created", lead);
}

export function attachSockets(
  httpServer: HttpServer,
  frontendOrigin: string,
): Server {
  const io = new Server(httpServer, {
    cors: { origin: frontendOrigin, methods: ["GET", "POST"] },
  });
  socketServer = io;

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (typeof token !== "string") {
      next();
      return;
    }

    try {
      const userId = verifyAccessToken(token);
      void getAuthenticatedUser(userId)
        .then((user) => {
          if (!user) {
            next(new Error("Socket account is not available."));
            return;
          }

          socket.data.brokerageId = user.brokerageId;
          next();
        })
        .catch((error: unknown) => next(error as Error));
    } catch {
      next(new Error("Invalid socket access token."));
    }
  });

  io.on("connection", (socket) => {
    const brokerageId = socket.data.brokerageId as string | null | undefined;
    if (brokerageId) {
      void socket.join(`brokerage:${brokerageId}`);
    }

    console.info(`Socket connected: ${socket.id}`);
    socket.on("disconnect", () =>
      console.info(`Socket disconnected: ${socket.id}`),
    );
  });

  return io;
}
