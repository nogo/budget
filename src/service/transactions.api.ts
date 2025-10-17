import { createServerFn } from "@tanstack/react-start";
import { IdSchema } from "./schema";
import {
  ListTransactionSchema,
  TransactionCreateSchema,
} from "./transactions.schema";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { eq, and, gte, lte, like, desc, SQL } from "drizzle-orm";
import db from "~/lib/db";
import { transactions, categories } from "~/db/schema";
import { parseSearchQuery } from "~/lib/query";
import { userRequiredMiddleware } from "~/lib/auth/middleware";

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
    amount: item.amount,
    type: item.type,
    categoryId: item.categoryId,
    category: item.category?.name,
    note: item.note,
    date: dayjs.unix(item.date).toDate(),
  };

  return result;
}

export const listTransactions = createServerFn()
  .middleware([userRequiredMiddleware])
  .inputValidator(ListTransactionSchema)
  .handler(async ({ data: { monthYear, query } }) => {
    const categoryNames = await db
      .select({ name: categories.name })
      .from(categories)
      .then((items) => items.map((c) => c.name));
    const parsed = parseSearchQuery(query, categoryNames);

    const whereConditions: SQL[] = [];

    // Apply month year filter only when no textQuery
    if (parsed?.textQuery) {
      const terms = parsed.textQuery.split(/\s+/);
      terms.forEach((term: string) => {
        whereConditions.push(like(transactions.note, `%${term}%`));
      });
    } else if (monthYear) {
      const startDate = monthYear.startOf("month").unix();
      const endDate = monthYear.endOf("month").unix();
      whereConditions.push(gte(transactions.date, startDate));
      whereConditions.push(lte(transactions.date, endDate));
    }

    // Get transactions from database
    const items = await db
      .select({
        id: transactions.id,
        amount: transactions.amount,
        type: transactions.type,
        categoryId: transactions.categoryId,
        date: transactions.date,
        note: transactions.note,
        category: {
          name: categories.name,
        },
      })
      .from(transactions)
      .leftJoin(categories, eq(transactions.categoryId, categories.id))
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
      .orderBy(desc(transactions.date), desc(transactions.id));

    return items
      .filter((item) => {
        if (parsed && parsed.categories.length > 0) {
          return (
            item.category && parsed.categories.includes(item.category.name)
          );
        }
        return true;
      })
      .filter((item) => {
        if (parsed && parsed.amounts.length > 0) {
          return parsed.amounts.includes(item.amount);
        }
        return true;
      })
      .map((item) => transformToTransaction(item));
  });

export const findTransactions = createServerFn()
  .middleware([userRequiredMiddleware])
  .inputValidator(IdSchema)
  .handler(async ({ data }) => {
    const result = await db
      .select()
      .from(transactions)
      .where(eq(transactions.id, data.id))
      .limit(1);
    return transformToTransaction(result[0]);
  });

export const crupTransaction = createServerFn({ method: "POST" })
  .middleware([userRequiredMiddleware])
  .inputValidator(TransactionCreateSchema)
  .handler(async ({ data: transactionData }) => {
    if (transactionData.id && transactionData.id > 0) {
      const result = await db
        .update(transactions)
        .set({
          amount: transactionData.amount,
          type: transactionData.type,
          categoryId: transactionData.categoryId,
          note: transactionData.note,
          date: dayjs.utc(transactionData.date).unix(),
        })
        .where(eq(transactions.id, transactionData.id))
        .returning();
      return transformToTransaction(result[0]);
    } else {
      const result = await db
        .insert(transactions)
        .values({
          amount: transactionData.amount,
          type: transactionData.type,
          categoryId: transactionData.categoryId,
          note: transactionData.note,
          date: dayjs.utc(transactionData.date).unix(),
        })
        .returning();
      return transformToTransaction(result[0]);
    }
  });

export const removeTransaction = createServerFn({ method: "POST" })
  .middleware([userRequiredMiddleware])
  .inputValidator(IdSchema)
  .handler(async ({ data }) => {
    const result = await db
      .delete(transactions)
      .where(eq(transactions.id, data.id))
      .returning();
    return transformToTransaction(result[0]);
  });
