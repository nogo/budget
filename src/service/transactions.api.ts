import { createServerFn } from "@tanstack/react-start";
import { db } from "~/lib/db";
import { IdSchema } from "./schema";
import { ListTransactionSchema, TransactionCreateSchema } from "./transactions.schema";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";

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

export const listTransactions = createServerFn()
  .validator(ListTransactionSchema)
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

export const findTransactions = createServerFn()
  .validator(IdSchema)
  .handler(async ({ data }) => {
    return await db.transaction
      .findFirst({
        where: {
          id: data.id,
        },
      })
      .then((item) => transformToTransaction(item));
  });

export const crupTransaction = createServerFn({ method: "POST" })
  .validator(TransactionCreateSchema)
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
  .validator(IdSchema)
  .handler(async ({ data }) => {
    return await db.transaction
      .delete({
        where: {
          id: data.id,
        },
      })
      .then((item) => transformToTransaction(item));
  });
