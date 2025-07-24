import { useForm } from "@tanstack/react-form";
import { useRouter } from "@tanstack/react-router";
import { Spinner } from "../Loader";
import {
  categoryQueries,
  useCrupTemplateMutation,
  useRemoveTemplateMutation,
} from "~/service/queries";
import { useTranslation } from "~/locales/translations";
import { Edit2, Trash2 } from "lucide-react";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import clsx from "clsx";
import { handleAmountString } from "~/lib/utils";
import { useQuery } from "@tanstack/react-query";

interface Template {
  id: number;
  amount: number;
  day: number;
  categoryId?: number | undefined;
  type: "expense" | "income";
  note: string;
}

interface TemplateFormProps {
  template: Template;
}

const TemplateEditForm: React.FC<TemplateFormProps> = ({ template }) => {
  const router = useRouter();
  const t = useTranslation("templates");
  const { data: categories } = useQuery(categoryQueries.list());

  const crupMutation = useCrupTemplateMutation();
  const removeMutation = useRemoveTemplateMutation();

  const navigateBack = () =>
    router.navigate({
      to: "/templates",
    });

  const form = useForm({
    defaultValues: {
      id: template.id,
      amount: template.amount,
      categoryId: template.categoryId,
      note: template.note,
      day: template.day,
      type: template.type,
    },
    onSubmit: ({ formApi, value }) => {
      crupMutation.mutateAsync({ data: value });
      formApi.reset();
      router.invalidate();
      router.navigate({ to: "/templates" });
    },
  });

  const showNote = function (categoryId: string | number | undefined) {
    if (!categories) return false;

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
                {categories &&
                  categories.map((category) => (
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

      <form.Field
        name="day"
        children={(field) => {
          return (
            <div className="grid w-full gap-1.5">
              <Label htmlFor={field.name}>{t("day")}</Label>
              <Input
                type="number"
                step="1"
                min="1"
                max="31"
                id={field.name}
                name={field.name}
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.valueAsNumber)}
                required
              />
            </div>
          );
        }}
      />

      <form.Field
        name="amount"
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

      <form.Subscribe
        selector={(state) => [state.canSubmit, state.isSubmitting]}
        children={([canSubmit, isSubmitting]) => (
          <div className="flex justify-between">
            <Button
              variant="destructive"
              onClick={() => {
                removeMutation.mutateAsync(
                  { data: { id: template.id } },
                  { onSuccess: () => navigateBack() },
                );
              }}
            >
              <Trash2 />
              <span className="sr-only">{t("delete")}</span>
            </Button>

            <Button type="submit" disabled={!canSubmit}>
              {isSubmitting ? <Spinner /> : <Edit2 />}
            </Button>
          </div>
        )}
      />
    </form>
  );
};

export default TemplateEditForm;
