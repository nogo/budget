import { useForm } from "@tanstack/react-form";
import { useRouter } from "@tanstack/react-router";
import { useTranslation } from "~/locales/translations";
import { Check, LoaderCircle } from "lucide-react";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Button } from "../ui/button";
import { categoryQueries, useCrupTemplateMutation } from "~/service/queries";
import { useQuery } from "@tanstack/react-query";
import { handleAmountString } from "~/lib/utils";
import clsx from "clsx";

const TemplateAddForm: React.FC = () => {
  const router = useRouter();
  const t = useTranslation("templates");
  const crupMutation = useCrupTemplateMutation();
  const { data: categories } = useQuery(categoryQueries.list());

  const form = useForm({
    defaultValues: {
      name: "",
      amount: 0,
      categoryId: 1,
      note: "",
      day: new Date().getDate(),
      type: "expense",
    },
    onSubmit: ({ formApi, value }) => {
      crupMutation.mutateAsync(
        { data: value },
        {
          onSuccess: () => {
            formApi.reset();
            router.invalidate();
          },
        }
      );
    },
  });

  const showNote = function (categoryId: string | number) {
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
      className="space-y-2"
    >
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
                    showNote(categoryId) ? "" : "hidden"
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
            <div className="grid grid-cols-2 w-full place-items-center items-center">
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
          <div className="grid w-full">
            <Button type="submit" disabled={!canSubmit}>
              {isSubmitting ? <LoaderCircle /> : <Check className="h-5" />}
            </Button>
          </div>
        )}
      />
    </form>
  );
};

export default TemplateAddForm;
