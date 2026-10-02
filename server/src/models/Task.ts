import { model, Schema, type InferSchemaType } from "mongoose";

export const TASK_STATUSES = [
  "Open",
  "In Progress",
  "Completed",
  "Cancelled",
] as const;

export type TaskStatus = (typeof TASK_STATUSES)[number];

export const ACTIVE_TASK_STATUSES = ["Open", "In Progress"] as const;

export const TASK_PRIORITIES = ["Low", "Medium", "High", "Urgent"] as const;

export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export const TASK_SOURCES = ["manual", "automation"] as const;

export type TaskSource = (typeof TASK_SOURCES)[number];

const taskSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    leadId: {
      type: Schema.Types.ObjectId,
      ref: "Lead",
      default: null,
    },
    clientId: {
      type: Schema.Types.ObjectId,
      ref: "Client",
      default: null,
    },
    assignedAdvisor: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    dueDate: { type: Date, default: null },
    status: {
      type: String,
      enum: TASK_STATUSES,
      default: "Open",
      required: true,
    },
    priority: {
      type: String,
      enum: TASK_PRIORITIES,
      default: "Medium",
      required: true,
    },
    overdue: { type: Boolean, default: false, required: true },
    completedAt: { type: Date, default: null },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    source: {
      type: String,
      enum: TASK_SOURCES,
      default: "manual",
      required: true,
    },
    automationKey: { type: String, default: null, select: false },
    brokerageId: {
      type: Schema.Types.ObjectId,
      ref: "Brokerage",
      required: true,
      index: true,
    },
  },
  { timestamps: true },
);

taskSchema.index({ brokerageId: 1, status: 1, dueDate: 1 });
taskSchema.index({ brokerageId: 1, assignedAdvisor: 1, status: 1 });
taskSchema.index({ brokerageId: 1, leadId: 1 });
// Serves the dashboard's overdue-task count scoped to a brokerage.
taskSchema.index({ brokerageId: 1, overdue: 1 });
taskSchema.index(
  { brokerageId: 1, automationKey: 1 },
  {
    unique: true,
    partialFilterExpression: { automationKey: { $type: "string" } },
  },
);

export type Task = InferSchemaType<typeof taskSchema>;
export const TaskModel = model("Task", taskSchema);
