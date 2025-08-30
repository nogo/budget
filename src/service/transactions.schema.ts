import { z } from "zod";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";

dayjs.extend(utc);

export const ListTransactionSchema = z.object({
  monthYear: z
    .string()
    .optional()
    .catch(() => dayjs().format("YYYY-MM"))
    .transform((d) => dayjs(d, "YYYY-MM", true)),
  query: z.string().optional(),
});

export const TransactionCreateSchema = z.object({
  id: z.number().optional(),
  amount: z.number().min(0),
  type: z.enum(["expense", "income"]),
  categoryId: z.number().min(1),
  date: z.date(),
  note: z.string().optional(),
});