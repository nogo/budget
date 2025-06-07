import { queryOptions } from "@tanstack/react-query";
import { fetchCategory, listCategories } from "./categories.api";
import { reviewCategoryMonth, reviewMonths, reviewYears } from "./review.api";
import { findTransactions, listTransactions } from "./transactions.api";
import { formatYearMonth, YearMonth, yearMonthNow } from "~/lib/yearmonth";

export const categoryQueries = {
  all: ["categories"],
  list: () =>
    queryOptions({
      queryKey: [...categoryQueries.all, "list"],
      queryFn: () => listCategories(),
    }),
  detail: (contactId: number) =>
    queryOptions({
      queryKey: [...categoryQueries.all, "detail", contactId],
      queryFn: () => fetchCategory({ data: { id: contactId } }),
      enabled: !!contactId,
    }),
};

export const reviewQueries = {
  all: ["reviews"],
  years: () =>
    queryOptions({
      queryKey: [...reviewQueries.all, "years"],
      queryFn: () => reviewYears(),
    }),
  year: (year: number) => {
    year = year || new Date().getFullYear();
    return queryOptions({
      queryKey: [...reviewQueries.all, year],
      queryFn: () => reviewMonths({ data: year }),
      enabled: !!year,
    });
  },
  month: (year: number, month: number) => {
    year = year || new Date().getFullYear();
    month = month || new Date().getMonth() + 1;
    if (month < 1 && month > 12) {
      month = new Date().getMonth() + 1;
    }

    return queryOptions({
      queryKey: [...reviewQueries.all, year, month],
      queryFn: () =>
        reviewCategoryMonth({
          data: {
            year: year,
            month: month,
          },
        }),
      enabled: !!year,
    });
  },
};

export const transactionQueries = {
  all: ["transactions"],
  list: (yearMonth?: YearMonth) => {
    yearMonth = yearMonth || yearMonthNow();
    const yearMonthString = formatYearMonth(yearMonth);

    return queryOptions({
      queryKey: [...transactionQueries.all, "list"],
      queryFn: () => listTransactions({ data: yearMonthString }),
    });
  },
  detail: (id: number) =>
    queryOptions({
      queryKey: [...transactionQueries.all, "detail", id],
      queryFn: () => findTransactions({ data: { id: id } }),
      enabled: !!id,
    }),
};
