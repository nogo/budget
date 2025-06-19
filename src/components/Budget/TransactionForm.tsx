import * as React from "react";
import { useForm } from "@tanstack/react-form";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { formatYearMonth, YearMonth } from "~/lib/yearmonth";
import { Transaction } from "~/service/transactions.api";
import { cn, handleAmountString } from "~/lib/utils";
import { Spinner } from "../Loader";
import { useTranslation } from "~/locales/translations";
import { Check, Save, Trash2 } from "lucide-react";
import {
  categoryQueries,
  useCrupTemplateMutation,
  useCrupTransactionMutation,
  useRemoveTransactionMutation,
} from "~/service/queries";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import TemplateCloud from "../templates/TemplateCloud";
import { defaultDate, formatIsoDate } from "~/lib/date";

interface TransactionFormProps {
  currentMonthYear: YearMonth;
  transaction?: Transaction | undefined;
}

const TransactionForm: React.FC<TransactionFormProps> = ({
  currentMonthYear,
  transaction,
}) => {
  const yearMonthString = formatYearMonth(currentMonthYear);

  const { data: categories } = useSuspenseQuery(categoryQueries.list());

  const router = useRouter();
  const t = useTranslation("budget");

  const editMutation = useCrupTransactionMutation();
  const removeMutation = useRemoveTransactionMutation();
  const crupTemplateMutation = useCrupTemplateMutation();

  const navigateBack = () => {
    router.navigate({
      to: "/$yearMonth",
      params: { yearMonth: yearMonthString },
    });
  };

  const form = useForm({
    defaultValues: {
      id: transaction?.id ?? -1,
      amount: transaction?.amount ?? 0.0,
      categoryId: transaction?.categoryId ?? categories[0]?.id,
      date: transaction?.date ?? defaultDate(currentMonthYear),
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

  const fillForm = function ({
    note,
    day,
    amount,
    type,
  }: {
    note: string;
    day: number;
    amount: number;
    type: "expense" | "income";
  }) {
    form.setFieldValue("note", note);
    form.setFieldValue("date", defaultDate(currentMonthYear, day));
    form.setFieldValue("amount", amount);
    form.setFieldValue("type", type);
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        form.handleSubmit();
      }}
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
        name="categoryId"
        children={(field) => {
          return (
            <div className="grid w-full gap-1.5 pt-3">
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
          <>
            <form.Field
              name="note"
              children={(field) => {
                return (
                  <div
                    className={cn(
                      "grid w-full gap-1.5 pt-3",
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
            <TemplateCloud categoryId={categoryId} onClick={fillForm} />
          </>
        )}
      />
      <form.Field
        name="date"
        children={(field) => {
          return (
            <div className="grid w-full gap-1.5 pt-3">
              <Label htmlFor={field.name}>{t("date")}</Label>
              <Input
                type="date"
                id={field.name}
                name={field.name}
                value={formatIsoDate(field.state.value)}
                onBlur={field.handleBlur}
                onChange={(e) =>
                  field.handleChange(
                    e.target.valueAsDate ? e.target.valueAsDate : defaultDate(),
                  )
                }
                required
              />
            </div>
          );
        }}
      />

      <form.Field
        name="type"
        children={(field) => {
          return (
            <div className="grid w-full grid-cols-2 place-items-center items-center px-4 pt-3">
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
                <span className="text-red-600">{t("expense")}</span>
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
                <span className="text-green-600">{t("income")}</span>
              </Label>
            </div>
          );
        }}
      />

      <form.Subscribe
        selector={(state) => [state.canSubmit, state.isSubmitting]}
        children={([canSubmit, isSubmitting]) => (
          <div
            className={cn(
              transaction
                ? "flex items-center gap-x-6 justify-between pt-3"
                : "grid w-full",
            )}
          >
            {transaction && (
              <>
                <Button
                  variant="destructive"
                  disabled={!canSubmit}
                  onClick={(e) => {
                    e.preventDefault();
                    removeMutation.mutateAsync(
                      { data: { id: transaction.id } },
                      { onSettled: () => navigateBack() },
                    );
                  }}
                >
                  <Trash2 />
                  <span className="sr-only">{t("delete")}</span>
                </Button>
                <Button
                  variant="secondary"
                  disabled={!canSubmit}
                  onClick={(e) => {
                    e.preventDefault();
                    crupTemplateMutation.mutateAsync({
                      data: {
                        categoryId: transaction.categoryId,
                        note: transaction.note,
                        amount: transaction.amount,
                        type: transaction.type,
                        day: transaction.date.getDate(),
                      },
                    });
                  }}
                >
                  <Save />
                  <span className="sr-only">{t("save")}</span>
                </Button>
              </>
            )}

            <Button type="submit" disabled={!canSubmit}>
              {isSubmitting ? <Spinner /> : <Check />}
            </Button>
          </div>
        )}
      />
    </form>
  );
};

export default TransactionForm;
