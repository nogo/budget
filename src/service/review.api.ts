import { createServerFn } from "@tanstack/react-start";
import { db } from "~/lib/db";
import { ReviewMonthSchema, ReviewMonthsSchema } from "./review.schema";
import { userRequiredMiddleware } from "./auth.api";

export type ReviewYear = {
  year: number;
  income: number;
  expense: number;
  total: number;
};

function transformToReviewYear(item: any): ReviewYear {
  const result: ReviewYear = {
    year: item.year,
    income: item.income,
    expense: item.expense,
    total: item.total,
  };
  return result;
}

export const reviewYears = createServerFn()
  .middleware([userRequiredMiddleware])
  .handler(async () => {
    return await db.reviewYears
      .findMany({
        orderBy: { year: "asc" },
      })
      .then((items) => items.map((item) => transformToReviewYear(item)));
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
    income: item.income,
    expense: item.expense,
    total: item.total,
  };
  return result;
}

export const reviewMonths = createServerFn()
  .validator(ReviewMonthsSchema)
  .middleware([userRequiredMiddleware])
  .handler(async ({ data: year }) => {
    return await db.reviewMonths
      .findMany({
        where: {
          year: year,
        },
        orderBy: { month: "asc" },
      })
      .then((items) => items.map((item) => transformToReviewMonth(item)));
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
    income: item.income,
    expense: item.expense,
    total: item.total,
  };
  return result;
}

export const reviewCategoryMonth = createServerFn()
  .validator(ReviewMonthSchema)
  .middleware([userRequiredMiddleware])
  .handler(async ({ data }) => {
    return await db.reviewCategoryMonths
      .findMany({
        where: {
          year: data.year,
          month: data.month,
        },
        orderBy: { month: "asc" },
      })
      .then((items) =>
        items.map((item) => transformToReviewCategoryMonth(item)),
      );
  });
