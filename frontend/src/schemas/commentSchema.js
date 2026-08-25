import { z } from "zod";

export const commentSchema = z.object({
  body: z.string().min(1, "Comment cannot be empty"),
});
