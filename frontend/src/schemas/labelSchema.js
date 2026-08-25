import { z } from "zod";

const hexColor = z
  .string()
  .regex(/^#[0-9A-Fa-f]{6}$/, "Color must be a hex value like #6B7280")
  .optional()
  .or(z.literal(""));

export const labelSchema = z.object({
  name: z.string().min(1, "Name is required").max(50, "Name is too long"),
  color: hexColor,
});

export const labelUpdateSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  color: hexColor.optional(),
});
