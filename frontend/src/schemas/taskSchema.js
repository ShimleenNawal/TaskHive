import { z } from "zod";

export const taskSchema = z.object({
  title: z.string().min(1, "Title is required").max(255, "Title is too long"),
  description: z.string().optional(),
  status: z.enum(["TODO", "IN_PROGRESS", "DONE"]).default("TODO"),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).default("MEDIUM"),
  due_date: z.string().optional(),
  assignee_id: z.string().optional(),
});

export const taskUpdateSchema = taskSchema.partial();
