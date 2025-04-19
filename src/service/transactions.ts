import { createServerFn } from "@tanstack/react-start";
import { queryOptions } from "@tanstack/react-query";
import { formatYearMonth, YearMonth, yearMonthNow } from "../utils/yearmonth";
import { z } from "zod";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { db } from "~/utils/db";

dayjs.extend(utc);

export type Transaction = {
  id: number;
  amount: number;
  type: "expense" | "income";
  categoryId: number;
  category?: string;
  note: string;
  date: Date;
};

function transformToTransaction(item: any): Transaction {
  const result: Transaction = {
    id: item.id,
    amount: item.amount.toNumber(),
    type: item.type,
    categoryId: item.categoryId,
    category: undefined,
    note: item.note,
    date: dayjs.unix(item.date).toDate(),
  };

  if (item.category) {
    result["category"] = item.category.name;
  }

  return result;
}

const listTransactionsSchema = z
  .string()
  .optional()
  .transform((d) => dayjs.utc(d, "YYYY-MM", true))
  .default(() => dayjs().format("YYYY-MM"));

export const listTransactions = createServerFn()
  .validator(listTransactionsSchema)
  .handler(async ({ data }) => {
    const startDate = data.startOf("month").unix();
    const endDate = data.endOf("month").unix();

    return await db.transaction
      .findMany({
        where: {
          date: {
            gte: startDate,
            lte: endDate,
          },
        },
        orderBy: [
          {
            date: "desc",
          },
          {
            id: "desc",
          },
        ],
        include: {
          category: {
            select: {
              name: true,
            },
          },
        },
      })
      .then((items) => items.map((item) => transformToTransaction(item)));
  });

export const listTransactionsQueryOptions = (yearMonth?: YearMonth) => {
  yearMonth = yearMonth || yearMonthNow();
  const yearMonthString = formatYearMonth(yearMonth);

  return queryOptions({
    queryKey: ["transactions", yearMonthString],
    queryFn: () => listTransactions({ data: yearMonthString }),
  });
};

export const findTransactions = createServerFn()
  .validator(z.coerce.number())
  .handler(async ({ data }) => {
    return await db.transaction
      .findFirst({
        where: {
          id: data,
        },
      })
      .then((item) => transformToTransaction(item));
  });

export const findTransactionsQueryOptions = (id: number) =>
  queryOptions({
    queryKey: ["transactions", id],
    queryFn: () => findTransactions({ data: id }),
  });

const transactionCreateSchema = z.object({
  id: z.number().optional(),
  amount: z.number().min(0),
  type: z.enum(["expense", "income"]),
  categoryId: z.number().min(1),
  date: z.date(),
  note: z.string().optional(),
});

export const crupTransaction = createServerFn({ method: "POST" })
  .validator(transactionCreateSchema)
  .handler(async ({ data: transactionData }) => {
    if (transactionData.id && transactionData.id > 0) {
      return await db.transaction
        .update({
          where: { id: transactionData.id },
          data: {
            id: transactionData.id,
            amount: transactionData.amount,
            type: transactionData.type,
            categoryId: transactionData.categoryId,
            note: transactionData.note,
            date: dayjs(transactionData.date).unix(),
          },
        })
        .then((item) => transformToTransaction(item));
    } else {
      return await db.transaction
        .create({
          data: {
            amount: transactionData.amount,
            type: transactionData.type,
            category: {
              connect: { id: transactionData.categoryId },
            },
            note: transactionData.note,
            date: dayjs(transactionData.date).unix(),
          },
          include: {
            category: true,
          },
        })
        .then((item) => transformToTransaction(item));
    }
  });

export const removeTransaction = createServerFn({ method: "POST" })
  .validator(z.coerce.number())
  .handler(async ({ data }) => {
    return await db.transaction
      .delete({
        where: {
          id: data,
        },
      })
      .then((item) => transformToTransaction(item));
  });
