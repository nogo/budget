import {
  queryOptions,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import {
  crupCategory,
  fetchCategory,
  listCategories,
  removeCategory,
} from "./categories.api";
import { reviewCategoryMonth, reviewMonths, reviewYears } from "./review.api";
import {
  crupTransaction,
  findTransactions,
  listTransactions,
  removeTransaction,
} from "./transactions.api";
import { formatYearMonth, YearMonth, yearMonthNow } from "~/lib/yearmonth";
import { getUserSession } from "./auth.api";

export const authQueries = {
  all: ["auth"],
  user: () =>
    queryOptions({
      queryKey: [...authQueries.all, "user"],
      queryFn: () => getUserSession(),
      staleTime: 5000,
    }),
};

export const categoryQueries = {
  all: ["categories"],
  list: () =>
    queryOptions({
      queryKey: [...categoryQueries.all, "list"],
      queryFn: () => listCategories(),
    }),
  detail: (categoryId: string) =>
    queryOptions({
      queryKey: [...categoryQueries.all, "detail", categoryId],
      queryFn: () => fetchCategory({ data: { id: categoryId } }),
      enabled: !!categoryId,
    }),
};

export const useCrupCategoryMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: crupCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: categoryQueries.all });
    },
  });
};

export const useRemoveCategoryMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: removeCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: categoryQueries.all });
    },
  });
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
  detail: (transactionId: string) =>
    queryOptions({
      queryKey: [...transactionQueries.all, "detail", transactionId],
      queryFn: () => findTransactions({ data: { id: transactionId } }),
      enabled: !!transactionId,
    }),
};

export const useCrupTransactionMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: crupTransaction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: transactionQueries.all });
    },
  });
};

export const useRemoveTransactionMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: removeTransaction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: transactionQueries.all });
    },
  });
};
