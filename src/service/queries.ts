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
import { reviewCategoryMonth, reviewMonths, reviewYears, reviewYearsWithCategoryFilter, reviewMonthsWithCategoryFilter } from "./review.api";
import {
  crupTemplate,
  fetchTemplate,
  listTemplates,
  removeTemplate,
} from "./templates.api";
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
  years: (categoryIds?: number[]) =>
    queryOptions({
      queryKey: [...reviewQueries.all, "years", categoryIds],
      queryFn: () => reviewYears({ data: { categoryIds } }),
    }),
  year: (year: number, categoryIds?: number[]) => {
    year = year || new Date().getFullYear();
    return queryOptions({
      queryKey: [...reviewQueries.all, year],
      queryFn: () => reviewMonths({ data: { year, categoryIds } }),
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

export const templateQueries = {
  all: ["templates"],
  list: () =>
    queryOptions({
      queryKey: [...templateQueries.all, "list"],
      queryFn: () => listTemplates({ data: { categoryId: undefined } }),
    }),
  listByCategory: (categoryId: string) =>
    queryOptions({
      queryKey: [...templateQueries.all, "list", "withCategory", categoryId],
      queryFn: () => listTemplates({ data: { categoryId: categoryId } }),
    }),
  detail: (templateId: string) =>
    queryOptions({
      queryKey: [...templateQueries.all, "detail", templateId],
      queryFn: () => fetchTemplate({ data: { id: templateId } }),
      enabled: !!templateId,
    }),
};

export const useCrupTemplateMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: crupTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: templateQueries.all });
    },
  });
};

export const useRemoveTemplateMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: removeTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: templateQueries.all });
    },
  });
};

export const transactionQueries = {
  all: ["transactions"],
  list: (yearMonth?: YearMonth, query?: string) => {
    yearMonth = yearMonth || yearMonthNow();
    const yearMonthString = formatYearMonth(yearMonth);

    return queryOptions({
      queryKey: [...transactionQueries.all, "list", yearMonthString, query],
      queryFn: () => listTransactions({ data: { monthYear: yearMonthString, query } }),
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
