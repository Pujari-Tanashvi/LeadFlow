import { Router } from "express";
import {
  completeTask,
  createTask,
  deleteTask,
  getTask,
  listTasks,
  updateTask,
} from "../controllers/taskController.js";
import {
  requireAuthentication,
  requireRoles,
} from "../middleware/authMiddleware.js";
import { requireTaskTenant } from "../middleware/taskTenantMiddleware.js";

export const taskRoutes = Router();

taskRoutes.use(
  requireAuthentication,
  requireTaskTenant,
  requireRoles("brokerage_admin", "advisor"),
);
taskRoutes.get("/", listTasks);
taskRoutes.post("/", createTask);
taskRoutes.get("/:id", getTask);
taskRoutes.post("/:id/complete", completeTask);
taskRoutes.patch("/:id", updateTask);
taskRoutes.delete("/:id", deleteTask);
