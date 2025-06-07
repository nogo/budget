import { z } from "zod/v4";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";

dayjs.extend(utc);

export const ListTransactionSchema = z
  .string()
  .optional()
  .transform((d) => dayjs.utc(d, "YYYY-MM", true))
  .default(() => dayjs().format("YYYY-MM"));

export const TransactionCreateSchema = z.object({
  id: z.number().optional(),
  amount: z.number().min(0),
  type: z.enum(["expense", "income"]),
  categoryId: z.number().min(1),
  date: z.date(),
  note: z.string().optional(),
});
