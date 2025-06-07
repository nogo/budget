import { z } from "zod/v4";

export const ReviewMonthsSchema = z.coerce
  .number()
  .min(1970)
  .max(9999)
  .optional()
  .default(() => new Date().getFullYear());

export const ReviewMonthSchema = z.object({
  year: ReviewMonthsSchema,
  month: z.coerce
    .number()
    .min(1)
    .max(12)
    .default(() => new Date().getMonth() + 1),
});
