import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import dayjs from "dayjs";
import { z } from "zod";

const reviewYearlySchema = z
  .string()
  .optional()
  .transform((d) => dayjs.utc(d, "YYYY", true))
  .default(() => dayjs().format("YYYY"));

export const reviewYearly = createServerFn()
  .validator(reviewYearlySchema)
  .handler(async ({ data }) => {});

export const reviewYearlyQueryOptions = (year: number) => {
  year = year || dayjs().year();
  const yearString = year.toString();

  return queryOptions({
    queryKey: ["review", yearString],
    queryFn: () => reviewYearly({ data: yearString }),
  });
};
