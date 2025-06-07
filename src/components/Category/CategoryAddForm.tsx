import { useForm } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { crupCategory } from "~/service/categories.api";
import { Spinner } from "../Loader";
import { Category } from "~/generated/db";
import { useTranslation } from "~/locales/translations";
import { Check } from "lucide-react";

const CategoryAddForm: React.FC = () => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const t = useTranslation("CategoryAddForm");

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
                <input
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
              <label
                htmlFor={field.name}
                className="ml-2 block text-sm text-gray-900"
              >
                <input
                  id={field.name}
                  type="checkbox"
                  checked={field.state.value}
                  onChange={(e) => field.handleChange(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-yellow-600 focus:ring-yellow-500"
                />{" "}
                {t("hasNotesLabel")}
              </label>
            );
          }}
        />
        <form.Subscribe
          selector={(state) => [state.canSubmit, state.isSubmitting]}
          children={([canSubmit, isSubmitting]) => (
            <>
              <button
                type="submit"
                disabled={!canSubmit}
                className="md rounded-full bg-green-600 px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-green-500 focus-visible:bg-green-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600"
              >
                {isSubmitting ? <Spinner /> : <Check className="h-5" />}
              </button>
            </>
          )}
        />
      </div>
    </form>
  );
};

export default CategoryAddForm;
