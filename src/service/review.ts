import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { db } from "~/lib/db";

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

export const reviewYears = createServerFn().handler(async () => {
  return await db.reviewYears
    .findMany({
      orderBy: { year: "asc" },
    })
    .then((items) => items.map((item) => transformToReviewYear(item)));
});

export const reviewYearsQueryOptions = () => {
  return queryOptions({
    queryKey: ["review"],
    queryFn: () => reviewYears(),
  });
};

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

const reviewMonthsSchema = z.coerce
  .number()
  .min(1970)
  .max(9999)
  .optional()
  .default(() => new Date().getFullYear());

export const reviewMonths = createServerFn()
  .validator(reviewMonthsSchema)
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

export const reviewMonthsQueryOptions = (year: number) => {
  year = year || new Date().getFullYear();

  return queryOptions({
    queryKey: ["review", year],
    queryFn: () => reviewMonths({ data: year }),
  });
};

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

const reviewMonthSchema = z.object({
  year: reviewMonthsSchema,
  month: z.coerce
    .number()
    .min(1)
    .max(12)
    .default(() => new Date().getMonth() + 1),
});

export const reviewCategoryMonth = createServerFn()
  .validator(reviewMonthSchema)
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

export const reviewCategoryMonthQueryOptions = (
  year: number,
  month: number,
) => {
  year = year || new Date().getFullYear();
  month = month || new Date().getMonth() + 1;
  if (month < 1 && month > 12) {
    month = new Date().getMonth() + 1;
  }

  return queryOptions({
    queryKey: ["review", year, month],
    queryFn: () =>
      reviewCategoryMonth({
        data: {
          year: year,
          month: month,
        },
      }),
  });
};
