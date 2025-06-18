import { z } from "zod/v4";

export const CategoryFilterSchema = z.object({
  categoryId: z.coerce.number().optional(),
});

export const TemplateSchema = z.object({
  id: z.number().optional(),
  amount: z.number().min(0),
  type: z.enum(["expense", "income"]),
  categoryId: z.number().min(1),
  day: z.number().min(1).max(31),
  note: z.string().optional(),
});
