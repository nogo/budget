import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import dayjs from "dayjs";
import { z } from "zod";
import { db } from "~/utils/db";

/*
export const reviewYears = createServerFn().handler(async () => {
  return await db.reviewYears.findMany();
});

export const reviewYearsQueryOptions = () => {
  return queryOptions({
    queryKey: ["review"],
    queryFn: () => reviewYears(),
  });
};

const reviewYearMonthSchema = z
  .string()
  .optional()
  .transform((d) => dayjs.utc(d, "YYYY", true))
  .default(() => dayjs().format("YYYY"));

export const reviewYearMonth = createServerFn()
  .validator(reviewYearMonthSchema)
  .handler(async ({ data }) => {});

export const reviewYearMonthQueryOptions = (year: number) => {
  year = year || dayjs().year();
  const yearString = year.toString();

  return queryOptions({
    queryKey: ["review", yearString],
    queryFn: () => reviewYearMonth({ data: yearString }),
  });
};
*/