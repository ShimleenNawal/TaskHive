import { z } from "zod";

export const projectSchema = z.object({
  name: z
    .string()
    .min(1, "Project name is required")
    .max(255, "Project name must be 255 characters or less"),

  description: z
    .string()
    .max(255, "Description must be 255 characters or less")
    .optional(),

  deadline: z.string().optional(),
});

export const inviteSchema = z.object({
  email: z.string().email("Enter a valid email address"),
});
