import { createServerFn } from "@tanstack/react-start";
import { ReviewMonthSchema, ReviewMonthsSchema, ReviewYearsWithCategoriesSchema, ReviewMonthsWithCategoriesSchema } from "./review.schema";
import { userRequiredMiddleware } from "./auth.api";
import prisma from "~/lib/prisma";
import { A } from "node_modules/better-auth/dist/shared/better-auth.xU7dIFql";

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
  .validator(ReviewYearsWithCategoriesSchema)
  .middleware([userRequiredMiddleware])
  .handler(async ({ data: { categoryIds } }) => {
    if (!categoryIds || categoryIds.length === 0) {
      return await prisma.reviewYears
        .findMany({
          orderBy: { year: "asc" },
        })
        .then((items) => items.map((item) => transformToReviewYear(item)));
    }

    return await prisma.reviewYearsWithCategories.groupBy({
      by: ['year'],
      where: {
        categoryId: {
          in: categoryIds
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
    }).then((items) => items.sort((a, b) => a.year - b.year).map((item) => transformToReviewYear({
      year: item.year,
      income: Math.round(Number(item._sum.income || 0) * 100) / 100,
      expense: Math.round(Number(item._sum.expense || 0) * 100) / 100,
      total: Number(item._sum.total || 0)
    })));
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
  .validator(ReviewMonthsWithCategoriesSchema)
  .middleware([userRequiredMiddleware])
  .handler(async ({ data: { year, categoryIds } }) => {
    if (!categoryIds || categoryIds.length === 0) {
      return await prisma.reviewMonths
        .findMany({
          where: {
            year: year,
          },
          orderBy: { month: "asc" },
        })
        .then((items) => items.map((item) => transformToReviewMonth(item)));
    }

    return await prisma.reviewMonthsWithCategories.groupBy({
      by: ['month'],
      where: {
        year: year,
        categoryId: {
          in: categoryIds
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
    }).then(items => items.sort((a, b) => a.month - b.month).map(item => transformToReviewMonth({
      month: item.month,
      income: Math.round(Number(item._sum.income || 0) * 100) / 100,
      expense: Math.round(Number(item._sum.expense || 0) * 100) / 100,
      total: Number(item._sum.total || 0)
    })));
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