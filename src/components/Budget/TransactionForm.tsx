import * as React from "react";
import { CheckIcon, TrashIcon } from "@heroicons/react/24/solid";
import { useForm } from "@tanstack/react-form";
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { formatYearMonth, YearMonth } from "~/lib/yearmonth";
import {
  crupTransaction,
  removeTransaction,
  Transaction,
} from "~/service/transactions";
import { categoriesQueryOptions } from "~/service/categories";
import { cn } from "~/lib/utils";
import { z } from "zod";
import dayjs from "dayjs";
import { Spinner } from "../Loader";
import { useTranslation } from "~/locales/translations";

interface TransactionFormProps {
  currentMonthYear: YearMonth;
  transaction?: Transaction;
}

function handleAmountString(value: string) {
  try {
    return z.coerce.number().positive().parse(value);
  } catch (e) {
    return 0.0;
  }
}

const TransactionForm: React.FC<TransactionFormProps> = ({
  currentMonthYear,
  transaction,
}) => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: categories } = useSuspenseQuery(categoriesQueryOptions());
  const yearMonthString = formatYearMonth(currentMonthYear);
  const t = useTranslation("TransactionForm");

  const edit = useMutation({
    mutationFn: async (value: Transaction) => {
      await crupTransaction({ data: value });
    },
    onSettled: () =>
      queryClient.invalidateQueries({
        queryKey: ["transactions", yearMonthString],
      }),
    onSuccess: () => {
      router.invalidate();
    },
  });

  const remove = useMutation({
    mutationFn: removeTransaction,
    onSuccess: async () => {
      router.invalidate();
      router.navigate({
        to: "/$yearMonth",
        params: { yearMonth: yearMonthString },
      });
    },
    onSettled: () =>
      queryClient.invalidateQueries({
        queryKey: ["transactions", yearMonthString],
      }),
  });

  const form = useForm({
    defaultValues: {
      id: transaction?.id ?? -1,
      amount: transaction?.amount ?? 0.0,
      categoryId: transaction?.categoryId ?? categories[0]?.id,
      date: transaction?.date ?? new Date(),
      type: transaction?.type ?? "expense",
      note: transaction?.note ?? "",
    },
    onSubmit: async ({ formApi, value }) => {
      await edit.mutateAsync(value);
      formApi.reset();
    },
  });

  const showNote = function (categoryId: string | number) {
    return (
      categories.find((category) => category.id === categoryId)?.hasNotes ||
      false
    );
  };

  return (
    <div className="md:w-80 md:flex-initial">
      <form
        className="border border-gray-300 bg-white p-6 shadow-md"
        method="post"
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          form.handleSubmit();
        }}
      >
        <div className="grid grid-cols-1 gap-y-4">
          <form.Field
            name="id"
            children={(field) => {
              return (
                <input
                  type="hidden"
                  id={field.name}
                  name={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.valueAsNumber)}
                />
              );
            }}
          />
          <form.Field
            name="amount"
            validators={{
              onBlur: ({ value }) =>
                value < 0.0 ? t("invalidValue") : undefined,
              onChange: ({ value }) => {
                return !value
                  ? t("amountRequired")
                  : value <= 0.0
                    ? t("amountGreaterThanZero")
                    : undefined;
              },
            }}
            children={(field) => {
              return (
                <div>
                  <label
                    htmlFor={field.name}
                    className="block text-sm/6 font-medium text-gray-900"
                  >
                    {t("amount")}
                  </label>
                  <div className="mt-1">
                    <div className="flex items-center bg-white pl-3 outline-1 -outline-offset-1 outline-gray-300 focus-within:outline-2 focus-within:-outline-offset-2 focus-within:outline-yellow-600">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        id={field.name}
                        name={field.name}
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) =>
                          field.handleChange(handleAmountString(e.target.value))
                        }
                        required
                        className="block min-w-0 grow py-1.5 pr-3 pl-1 text-base text-gray-900 placeholder:text-gray-400 focus:outline-none sm:text-sm/6"
                      />
                    </div>
                    {field.state.meta.errors ? (
                      <em className="text-sm text-red-500">
                        {field.state.meta.errors.join(", ")}
                      </em>
                    ) : null}
                  </div>
                </div>
              );
            }}
          />
          <form.Field
            name="categoryId"
            children={(field) => {
              return (
                <div>
                  <label
                    htmlFor={field.name}
                    className="block text-sm/6 font-medium text-gray-900"
                  >
                    {t("category")}
                  </label>
                  <div className="mt-1">
                    <div className="flex items-center bg-white pl-3 outline-1 -outline-offset-1 outline-gray-300 focus-within:outline-2 focus-within:-outline-offset-2 focus-within:outline-yellow-600">
                      <select
                        id={field.name}
                        name={field.name}
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) =>
                          field.handleChange(Number(e.target.value))
                        }
                        className="block min-w-0 grow py-1.5 pr-3 pl-1 text-base text-gray-900 placeholder:text-gray-400 focus:outline-none sm:text-sm/6"
                      >
                        {categories.map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              );
            }}
          />

          <form.Subscribe
            selector={(state) => state.values.categoryId}
            children={(categoryId) => (
              <form.Field
                name="note"
                children={(field) => {
                  return (
                    <div className={showNote(categoryId) ? "" : "hidden"}>
                      <label
                        htmlFor={field.name}
                        className="block text-sm/6 font-medium text-gray-900"
                      >
                        {t("note")}
                      </label>
                      <div className="mt-1">
                        <div className="flex items-center bg-white pl-3 outline-1 -outline-offset-1 outline-gray-300 focus-within:outline-2 focus-within:-outline-offset-2 focus-within:outline-yellow-600">
                          <input
                            id={field.name}
                            name={field.name}
                            value={field.state.value}
                            onBlur={field.handleBlur}
                            onChange={(e) => field.handleChange(e.target.value)}
                            className="block min-w-0 grow py-1.5 pr-3 pl-1 text-base text-gray-900 placeholder:text-gray-400 focus:outline-none sm:text-sm/6"
                          />
                        </div>
                      </div>
                    </div>
                  );
                }}
              />
            )}
          />

          <form.Field
            name="date"
            children={(field) => {
              return (
                <div>
                  <label
                    htmlFor={field.name}
                    className="block text-sm/6 font-medium text-gray-900"
                  >
                    {t("date")}
                  </label>
                  <div className="mt-1">
                    <div className="flex items-center bg-white pl-3 outline-1 -outline-offset-1 outline-gray-300 focus-within:outline-2 focus-within:-outline-offset-2 focus-within:outline-yellow-600">
                      <input
                        type="date"
                        id={field.name}
                        name={field.name}
                        value={dayjs(field.state.value).format("YYYY-MM-DD")}
                        onBlur={field.handleBlur}
                        onChange={(e) =>
                          field.handleChange(
                            e.target.valueAsDate
                              ? e.target.valueAsDate
                              : dayjs().toDate(),
                          )
                        }
                        required
                        className="block min-w-0 grow py-1.5 pr-3 pl-1 text-base text-gray-900 placeholder:text-gray-400 focus:outline-none sm:text-sm/6"
                      />
                    </div>
                  </div>
                </div>
              );
            }}
          />
          <form.Field
            name="type"
            children={(field) => {
              return (
                <div className="grid grid-cols-2 place-items-center items-center px-4">
                  <label htmlFor="expense" className="flex gap-3">
                    <input
                      id="expense"
                      name={field.name}
                      type="radio"
                      value="expense"
                      checked={field.state.value === "expense"}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange("expense")}
                      required
                    />
                    <span>{t("expense")}</span>
                  </label>
                  <label htmlFor="income" className="flex gap-3">
                    <input
                      id="income"
                      name={field.name}
                      value={"income"}
                      checked={field.state.value === "income"}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange("income")}
                      type="radio"
                      required
                    />
                    <span>{t("income")}</span>
                  </label>
                </div>
              );
            }}
          />

          <div
            className={cn(
              "mt-6 flex items-center gap-x-6",
              transaction ? "justify-between" : "justify-end",
            )}
          >
            {transaction && (
              <button
                onClick={() => remove.mutate({ data: transaction.id })}
                className="md rounded-full bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-red-500 focus-visible:bg-red-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
              >
                <TrashIcon className="h-6" />
                <span className="sr-only">{t("delete")}</span>
              </button>
            )}

            <form.Subscribe
              selector={(state) => [state.canSubmit, state.isSubmitting]}
              children={([canSubmit, isSubmitting]) => (
                <>
                  <button
                    type="submit"
                    disabled={!canSubmit}
                    className="md rounded-full bg-green-600 px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-green-500 focus-visible:bg-green-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600"
                  >
                    {isSubmitting ? <Spinner /> : <CheckIcon className="h-6" />}
                    <span className="sr-only">{t("save")}</span>
                  </button>
                </>
              )}
            />
          </div>
        </div>
      </form>
    </div>
  );
};

export default TransactionForm;
