import type { Server as HttpServer } from "node:http";
import { Server } from "socket.io";
import { getAuthenticatedUser } from "../services/userService.js";
import { verifyAccessToken } from "../services/authService.js";
import { ClientModel } from "../models/Client.js";

let socketServer: Server | undefined;

export function emitLeadCreated(brokerageId: string, lead: unknown): void {
  socketServer?.to(`brokerage:${brokerageId}`).emit("lead.created", lead);
}

export function emitDocumentStatus(
  brokerageId: string,
  clientId: string,
  document: unknown,
): void {
  socketServer
    ?.to(`brokerage:${brokerageId}`)
    .emit("document.status", document);
  socketServer?.to(`client:${clientId}`).emit("document.status", document);
}

export type TaskEvent = "created" | "updated" | "deleted" | "overdue";

export function emitTaskEvent(
  brokerageId: string,
  event: TaskEvent,
  task: unknown,
): void {
  socketServer?.to(`brokerage:${brokerageId}`).emit(`task.${event}`, task);
}

/**
 * Broadcast a fresh dashboard summary to a brokerage so displayed statistics
 * stay current after a lead/client change. Task-derived figures (overdue
 * tasks) already reach clients through the existing task.* events.
 */
export function emitDashboardStats(brokerageId: string, stats: unknown): void {
  socketServer?.to(`brokerage:${brokerageId}`).emit("dashboard.stats", stats);
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
        .then(async (user) => {
          if (!user) {
            next(new Error("Socket account is not available."));
            return;
          }

          if (user.role === "client" && user.brokerageId) {
            const client = await ClientModel.findOne({
              userId: user.id,
              brokerageId: user.brokerageId,
            })
              .select("_id")
              .exec();
            if (!client) {
              next(new Error("Socket client profile is not available."));
              return;
            }
            socket.data.clientId = client._id.toString();
          } else {
            socket.data.brokerageId = user.brokerageId;
          }
          next();
        })
        .catch((error: unknown) => next(error as Error));
    } catch {
      next(new Error("Invalid socket access token."));
    }
  });

  io.on("connection", (socket) => {
    const clientId = socket.data.clientId as string | undefined;
    if (clientId) {
      void socket.join(`client:${clientId}`);
    }
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
