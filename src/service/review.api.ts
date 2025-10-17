import { createServerFn } from "@tanstack/react-start";
import { ReviewMonthSchema, ReviewYearsWithCategoriesSchema, ReviewMonthsWithCategoriesSchema } from "./review.schema";
import { eq, inArray, sql } from "drizzle-orm";
import db from "~/lib/db";
import {
  reviewYears as reviewYearsView,
  reviewMonths as reviewMonthsView,
  reviewCategoryMonths as reviewCategoryMonthsView,
  reviewYearsWithCategories as reviewYearsWithCategoriesView,
  reviewMonthsWithCategories as reviewMonthsWithCategoriesView
} from "~/db/schema";
import { userRequiredMiddleware } from "~/lib/auth/middleware";

export type ReviewYear = {
  year: number;
  income: number;
  expense: number;
  total: number;
};

function transformToReviewYear(item: any): ReviewYear {
  const result: ReviewYear = {
    year: item.year,
    income: Math.round(item.income * 100) / 100,
    expense: Math.round(item.expense * 100) / 100,
    total: item.total,
  };
  return result;
}

export const reviewYears = createServerFn()
  .middleware([userRequiredMiddleware])
  .inputValidator(ReviewYearsWithCategoriesSchema)
  .handler(async ({ data: { categoryIds } }) => {
    if (!categoryIds || categoryIds.length === 0) {
      const items = await db
        .select()
        .from(reviewYearsView)
        .orderBy(sql`year ASC`);
      return items.map((item) => transformToReviewYear(item));
    }

    const items = await db
      .select({
        year: reviewYearsWithCategoriesView.year,
        income: sql<number>`SUM(${reviewYearsWithCategoriesView.income})`.as('income'),
        expense: sql<number>`SUM(${reviewYearsWithCategoriesView.expense})`.as('expense'),
        total: sql<number>`SUM(${reviewYearsWithCategoriesView.total})`.as('total'),
      })
      .from(reviewYearsWithCategoriesView)
      .where(inArray(reviewYearsWithCategoriesView.categoryId, categoryIds))
      .groupBy(reviewYearsWithCategoriesView.year)
      .orderBy(sql`year ASC`);

    return items.sort((a, b) => a.year - b.year).map((item) => transformToReviewYear({
      year: item.year,
      income: Math.round(Number(item.income || 0) * 100) / 100,
      expense: Math.round(Number(item.expense || 0) * 100) / 100,
      total: Number(item.total || 0)
    }));
  });

export type ReviewMonth = {
  month: number;
  income: number;
  expense: number;
  total: number;
};

function transformToReviewMonth(item: any): ReviewMonth {
  const result: ReviewMonth = {
    month: item.month,
    income: Math.round(item.income * 100) / 100,
    expense: Math.round(item.expense * 100) / 100,
    total: item.total,
  };
  return result;
}

export const reviewMonths = createServerFn()
  .middleware([userRequiredMiddleware])
  .inputValidator(ReviewMonthsWithCategoriesSchema)
  .handler(async ({ data: { year, categoryIds } }) => {
    if (!categoryIds || categoryIds.length === 0) {
      const items = await db
        .select()
        .from(reviewMonthsView)
        .where(eq(reviewMonthsView.year, year))
        .orderBy(sql`month ASC`);
      return items.map((item) => transformToReviewMonth(item));
    }

    const items = await db
      .select({
        month: reviewMonthsWithCategoriesView.month,
        income: sql<number>`SUM(${reviewMonthsWithCategoriesView.income})`.as('income'),
        expense: sql<number>`SUM(${reviewMonthsWithCategoriesView.expense})`.as('expense'),
        total: sql<number>`SUM(${reviewMonthsWithCategoriesView.total})`.as('total'),
      })
      .from(reviewMonthsWithCategoriesView)
      .where(
        sql`${reviewMonthsWithCategoriesView.year} = ${year} AND ${reviewMonthsWithCategoriesView.categoryId} IN ${categoryIds}`
      )
      .groupBy(reviewMonthsWithCategoriesView.month)
      .orderBy(sql`month ASC`);

    return items.sort((a, b) => a.month - b.month).map(item => transformToReviewMonth({
      month: item.month,
      income: Math.round(Number(item.income || 0) * 100) / 100,
      expense: Math.round(Number(item.expense || 0) * 100) / 100,
      total: Number(item.total || 0)
    }));
  });

export type ReviewCategoryMonth = {
  category: string;
  income: number;
  expense: number;
  total: number;
};

function transformToReviewCategoryMonth(item: any): ReviewCategoryMonth {
  const result: ReviewCategoryMonth = {
    category: item.categoryName,
    income: Math.round(item.income * 100) / 100,
    expense: Math.round(item.expense * 100) / 100,
    total: item.total,
  };
  return result;
}

export const reviewCategoryMonth = createServerFn()
  .middleware([userRequiredMiddleware])
  .inputValidator(ReviewMonthSchema)
  .handler(async ({ data }) => {
    const items = await db
      .select()
      .from(reviewCategoryMonthsView)
      .where(
        sql`${reviewCategoryMonthsView.year} = ${data.year} AND ${reviewCategoryMonthsView.month} = ${data.month}`
      )
      .orderBy(sql`month ASC`);

    return items.map((item) => transformToReviewCategoryMonth(item));
  });