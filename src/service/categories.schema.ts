import { z } from "zod/v4";

export const CategorySchema = z.object({
  id: z.number().optional(),
  name: z.string(),
  hasNotes: z.boolean(),
});
