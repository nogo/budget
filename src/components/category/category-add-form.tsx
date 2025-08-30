import { useForm } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { crupCategory } from "~/service/categories.api";
import { Spinner } from "../Loader";
import { useTranslation } from "~/locales/translations";
import { Check } from "lucide-react";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Checkbox } from "../ui/checkbox";
import { Button } from "../ui/button";

type Category = {
  id: number;
  name: string;
  hasNotes: boolean;
};

const CategoryAddForm: React.FC = () => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const t = useTranslation("categories");

  const { mutate } = useMutation({
    mutationFn: async (value: Category) => {
      await crupCategory({ data: value });
    },
    onSettled: () =>
      queryClient.invalidateQueries({
        queryKey: ["categories"],
      }),
  });

  const form = useForm({
    defaultValues: {
      id: -1,
      name: "",
      hasNotes: false,
    },
    onSubmit: ({ formApi, value }) => {
      mutate(value, {
        onSuccess: () => {
          formApi.reset();
          router.invalidate();
        },
      });
    },
  });

  return (
    <form
      className="mt-2 border-t border-gray-300 px-4 py-2"
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        form.handleSubmit();
      }}
    >
      <div className="flex items-center justify-between gap-4">
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
              <div className="flex grow-1 gap-3 border-b border-gray-300">
                <Input
                  id={field.name}
                  name={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  required
                  placeholder={t("addCategoryPlaceholder")}
                  className="grow-1"
                />
              </div>
            );
          }}
        />
        <form.Field
          name="hasNotes"
          children={(field) => {
            return (
              <Label
                htmlFor={field.name}
                className="ml-2 block text-sm text-gray-900"
              >
                <Checkbox
                  id={field.name}
                  checked={field.state.value}
                  onCheckedChange={(checked) =>
                    field.handleChange(checked === true)
                  }
                />{" "}
                {t("hasNotesLabel")}
              </Label>
            );
          }}
        />
        <form.Subscribe
          selector={(state) => [state.canSubmit, state.isSubmitting]}
          children={([canSubmit, isSubmitting]) => (
            <>
              <Button type="submit" disabled={!canSubmit}>
                {isSubmitting ? <Spinner /> : <Check className="h-5" />}
              </Button>
            </>
          )}
        />
      </div>
    </form>
  );
};

export default CategoryAddForm;
