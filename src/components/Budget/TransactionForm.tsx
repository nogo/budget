import * as React from "react";
import { useForm } from "@tanstack/react-form";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { formatYearMonth, YearMonth } from "~/lib/yearmonth";
import { Transaction } from "~/service/transactions.api";
import { cn } from "~/lib/utils";
import { z } from "zod/v4";
import dayjs from "dayjs";
import { Spinner } from "../Loader";
import { useTranslation } from "~/locales/translations";
import { Check, Trash2 } from "lucide-react";
import {
  categoryQueries,
  useCrupTransactionMutation,
  useRemoveTransactionMutation,
} from "~/service/queries";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import clsx from "clsx";

interface TransactionFormProps {
  currentMonthYear: YearMonth;
  transaction?: Transaction | undefined;
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
  const yearMonthString = formatYearMonth(currentMonthYear);

  const { data: categories } = useSuspenseQuery(categoryQueries.list());

  const router = useRouter();
  const t = useTranslation("TransactionForm");

  const editMutation = useCrupTransactionMutation();
  const removeMutation = useRemoveTransactionMutation();

  const navigateBack = () =>
    router.navigate({
      to: "/$yearMonth",
      params: { yearMonth: yearMonthString },
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
      await editMutation.mutateAsync({ data: value });

      formApi.reset();
      navigateBack();
    },
  });

  const showNote = function (categoryId: string | number) {
    return (
      categories.find((category) => category.id === categoryId)?.hasNotes ||
      false
    );
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        form.handleSubmit();
      }}
      className="grid gap-4"
    >
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
          onBlur: ({ value }) => (value < 0.0 ? t("invalidValue") : undefined),
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
            <div className="grid w-full gap-1.5">
              <Label htmlFor={field.name}>{t("amount")}</Label>
              <Input
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
              />
              {field.state.meta.errors ? (
                <em className="text-sm text-red-500">
                  {field.state.meta.errors.join(", ")}
                </em>
              ) : null}
            </div>
          );
        }}
      />
      <form.Field
        name="date"
        children={(field) => {
          return (
            <div className="grid w-full gap-1.5">
              <Label htmlFor={field.name}>{t("date")}</Label>
              <Input
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
              />
            </div>
          );
        }}
      />

      <form.Field
        name="categoryId"
        children={(field) => {
          return (
            <div className="grid w-full gap-1.5">
              <Label htmlFor={field.name}>{t("category")}</Label>
              <select
                id={field.name}
                name={field.name}
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(Number(e.target.value))}
                className="border-input w-full rounded-md border bg-transparent px-3 py-2 text-sm whitespace-nowrap shadow-xs outline-none"
              >
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
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
                <div
                  className={clsx(
                    "grid w-full gap-1.5",
                    showNote(categoryId) ? "" : "hidden",
                  )}
                >
                  <Label htmlFor={field.name}>{t("note")}</Label>
                  <Input
                    id={field.name}
                    name={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                </div>
              );
            }}
          />
        )}
      />

      <form.Field
        name="type"
        children={(field) => {
          return (
            <div className="grid w-full grid-cols-2 place-items-center items-center px-4">
              <Label htmlFor="expense" className="flex gap-2">
                <Input
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
              </Label>
              <Label htmlFor="income" className="flex gap-2">
                <Input
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
              </Label>
            </div>
          );
        }}
      />

      <div
        className={cn(
          "flex items-center gap-x-6",
          transaction ? "justify-between" : "justify-end",
        )}
      >
        {transaction && (
          <Button
            variant="destructive"
            onClick={() => {
              removeMutation
                .mutateAsync({ data: { id: transaction.id } })
                .then(() => navigateBack());
            }}
          >
            <Trash2 />
            <span className="sr-only">{t("delete")}</span>
          </Button>
        )}

        <form.Subscribe
          selector={(state) => [state.canSubmit, state.isSubmitting]}
          children={([canSubmit, isSubmitting]) => (
            <Button
              type="submit"
              variant={"default"}
              disabled={!canSubmit}
              className="bg-green-600"
            >
              {isSubmitting ? <Spinner /> : <Check />}
              <span className="sr-only">{t("save")}</span>
            </Button>
          )}
        />
      </div>
    </form>
  );
};

export default TransactionForm;
