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

export const ReviewYearsWithCategoriesSchema = z.object({
  categoryIds: z.array(z.coerce.number()).optional(),
});

export const ReviewMonthsWithCategoriesSchema = z.object({
  year: ReviewMonthsSchema,
  categoryIds: z.array(z.coerce.number()).optional(),
});

export const ReviewSearchSchema = z.object({
  categories: z.string().optional(),
});
