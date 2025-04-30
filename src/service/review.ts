import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { db } from "~/utils/db";

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

const reviewYearMonthSchema = z
  .string()
  .optional()
  .transform((d) => {
    const year = Number(d);
    if (!isNaN(year) && year >= 1000 && year <= 9999) {
      return year;
    }
    return new Date().getFullYear();
  })
  .default(() => new Date().getFullYear().toString());

export const reviewYearMonth = createServerFn()
  .validator(reviewYearMonthSchema)
  .handler(async ({ data }) => {
    return await db.reviewMonths
      .findMany({
        where: {
          year: data,
        },
        orderBy: { month: "asc" },
      })
      .then((items) => items.map((item) => transformToReviewMonth(item)));
  });

export const reviewYearMonthQueryOptions = (year: number) => {
  year = year || new Date().getFullYear();
  const yearString = year.toString();

  return queryOptions({
    queryKey: ["review", yearString],
    queryFn: () => reviewYearMonth({ data: yearString }),
  });
};
