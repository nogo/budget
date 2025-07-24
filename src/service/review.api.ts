import { createServerFn } from "@tanstack/react-start";
import { ReviewMonthSchema, ReviewMonthsSchema, ReviewYearsWithCategoriesSchema, ReviewMonthsWithCategoriesSchema } from "./review.schema";
import { userRequiredMiddleware } from "./auth.api";
import prisma from "~/lib/prisma";

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
    return await prisma.reviewYears
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
    return await prisma.reviewMonths
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
    return await prisma.reviewCategoryMonths
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

export const reviewYearsWithCategoryFilter = createServerFn()
  .validator(ReviewYearsWithCategoriesSchema)
  .middleware([userRequiredMiddleware])
  .handler(async ({ data }) => {
    if (!data.categoryIds || data.categoryIds.length === 0) {
      return await prisma.reviewYears
        .findMany({
          orderBy: { year: "asc" },
        })
        .then((items) => items.map((item) => transformToReviewYear(item)));
    }

    // Use the optimized view with single query
    const results = await prisma.reviewYearsWithCategories.groupBy({
      by: ['year'],
      where: {
        categoryId: {
          in: data.categoryIds
        }
      },
      _sum: {
        income: true,
        expense: true,
        total: true
      },
      orderBy: {
        year: 'asc'
      }
    });

    return results.map(result => transformToReviewYear({
      year: result.year,
      income: Number(result._sum.income || 0),
      expense: Number(result._sum.expense || 0),
      total: Number(result._sum.total || 0)
    }));
  });

export const reviewMonthsWithCategoryFilter = createServerFn()
  .validator(ReviewMonthsWithCategoriesSchema)
  .middleware([userRequiredMiddleware])
  .handler(async ({ data }) => {
    if (!data.categoryIds || data.categoryIds.length === 0) {
      return await prisma.reviewMonths
        .findMany({
          where: {
            year: data.year,
          },
          orderBy: { month: "asc" },
        })
        .then((items) => items.map((item) => transformToReviewMonth(item)));
    }

    // Use the optimized view with single query
    const results = await prisma.reviewMonthsWithCategories.groupBy({
      by: ['month'],
      where: {
        year: data.year,
        categoryId: {
          in: data.categoryIds
        }
      },
      _sum: {
        income: true,
        expense: true,
        total: true
      },
      orderBy: {
        month: 'asc'
      }
    });

    return results.map(result => transformToReviewMonth({
      month: result.month,
      income: Number(result._sum.income || 0),
      expense: Number(result._sum.expense || 0),
      total: Number(result._sum.total || 0)
    }));
  });
