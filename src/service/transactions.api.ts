import { createServerFn } from "@tanstack/react-start";
import { IdSchema } from "./schema";
import { ListTransactionSchema, TransactionCreateSchema } from "./transactions.schema";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import prisma from "~/lib/prisma";
import { TransactionWhereInput } from "~/generated/prisma/models";
import { parseSearchQuery } from "~/lib/query";

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
  .handler(async ({ data: { monthYear, query } }) => {
    const categoryNames = await prisma.category.findMany({ select: { name: true } }).then(items => items.map(c => c.name));
    const parsed = parseSearchQuery(query, categoryNames);

    const whereConditions: TransactionWhereInput = {};

    // Apply month year filter only when no textQuery
    if (parsed?.textQuery) {
      whereConditions.AND = parsed.textQuery
        .split(/\s+/)
        .map((term: string) => ({
          note: { contains: term }
        }));
    } else if (monthYear) {
      const startDate = monthYear.startOf("month").unix();
      const endDate = monthYear.endOf("month").unix();
      whereConditions.date = {
        gte: startDate,
        lte: endDate,
      };
    }

    // Get transactions from database
    return await prisma.transaction
      .findMany({
        where: whereConditions,
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
      .then(items => items
        .filter(item => {
          if (parsed && parsed.categories.length > 0) {
            return item.category && parsed.categories.includes(item.category.name)
          }
          return true;
        })
        .filter(item => {
          if (parsed && parsed.amounts.length > 0) {
            return parsed.amounts.includes(item.amount.toNumber())
          }
          return true;
        })
        .map(item => transformToTransaction(item))
      );
  });

export const findTransactions = createServerFn()
  .validator(IdSchema)
  .handler(async ({ data }) => {
    return await prisma.transaction
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
      return await prisma.transaction
        .update({
          where: { id: transactionData.id },
          data: {
            id: transactionData.id,
            amount: transactionData.amount,
            type: transactionData.type,
            categoryId: transactionData.categoryId,
            note: transactionData.note,
            date: dayjs.utc(transactionData.date).unix(),
          },
        })
        .then((item) => transformToTransaction(item));
    } else {
      return await prisma.transaction
        .create({
          data: {
            amount: transactionData.amount,
            type: transactionData.type,
            category: {
              connect: { id: transactionData.categoryId },
            },
            note: transactionData.note,
            date: dayjs.utc(transactionData.date).unix(),
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
    return await prisma.transaction
      .delete({
        where: {
          id: data.id,
        },
      })
      .then((item) => transformToTransaction(item));
  });