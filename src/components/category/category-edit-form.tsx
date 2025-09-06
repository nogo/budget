import { useForm } from "@tanstack/react-form";
import { useRouter } from "@tanstack/react-router";
import { useCrupCategoryMutation } from "~/service/queries";
import { useTranslation } from "~/locales/translations";
import { Edit2, LoaderCircle } from "lucide-react";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { Checkbox } from "../ui/checkbox";

interface Category {
  id: number;
  name: string;
  hasNotes: boolean;
}

interface CategoryFormProps {
  category: Category;
}

const CategoryEditForm: React.FC<CategoryFormProps> = ({ category }) => {
  const router = useRouter();
  const crupMutation = useCrupCategoryMutation();
  const t = useTranslation("categories");

  const form = useForm({
    defaultValues: {
      id: category.id,
      name: category.name,
      hasNotes: category.hasNotes,
    },
    onSubmit: ({ formApi, value }) => {
      crupMutation.mutateAsync({ data: value });
      formApi.reset();
      router.invalidate();
      router.navigate({ to: "/categories" });
    },
  });

  return (
    <form
      className="mt-2 grid gap-y-4 border-t p-6 px-4 py-2"
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
        name="name"
        children={(field) => {
          return (
            <div>
              <label
                htmlFor={field.name}
                className="block text-sm/6 font-medium text-gray-900"
              >
                Name
              </label>
              <div className="mt-1">
                <div className="flex items-center bg-white pl-3 outline-1 -outline-offset-1 outline-gray-300 focus-within:outline-2 focus-within:-outline-offset-2 focus-within:outline-yellow-600">
                  <input
                    id={field.name}
                    name={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    required
                    placeholder={"Edit " + category.name}
                    className="block min-w-0 grow py-1.5 pr-3 pl-1 text-base text-gray-900 placeholder:text-gray-400 focus:outline-none sm:text-sm/6"
                  />
                </div>
              </div>
            </div>
          );
        }}
      />
      <form.Field
        name="hasNotes"
        children={(field) => {
          return (
            <div className="flex gap-1">
              <Checkbox
                id={field.name}
                checked={field.state.value}
                onCheckedChange={(checked) =>
                  field.handleChange(checked == true)
                }
              />
              <Label htmlFor={field.name}>{t("hasNotesLabel")}</Label>
            </div>
          );
        }}
      />
      <form.Subscribe
        selector={(state) => [state.canSubmit, state.isSubmitting]}
        children={([canSubmit, isSubmitting]) => (
          <div className="flex justify-between">
            <Button
              type="button"
              variant="secondary"
              onClick={() => router.navigate({ to: "/categories" })}
            >
              {t("cancel")}
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              {isSubmitting ? <LoaderCircle /> : <Edit2 />}
            </Button>
          </div>
        )}
      />
    </form>
  );
};

export default CategoryEditForm;
