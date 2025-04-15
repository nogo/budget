import { useForm } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { Category } from "~/db/generated";
import { crupCategory } from "~/service/categories";
import { Spinner } from "../Loader";

interface CategoryFormProps {
  category: Category;
}

const CategoryEditForm: React.FC<CategoryFormProps> = ({ category }) => {
  const router = useRouter();
  const queryClient = useQueryClient();

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
      id: category.id,
      name: category.name,
      hasNotes: category.hasNotes,
    },
    onSubmit: ({ formApi, value }) => {
      mutate(value, {
        onSuccess: () => {
          formApi.reset();
          router.invalidate();
          router.navigate({ to: "/categories" });
        },
      });
    },
  });

  return (
    <div className="flex flex-col p-4">
      <h1 className="text-2xl font-bold">Edit Category</h1>
      <form
        className="mt-2 grid gap-y-4 border border-t border-gray-300 bg-white p-6 px-4 py-2 shadow-md"
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
              <div className="">
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
                  Has Notes
                </label>
              </div>
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
                {isSubmitting ? <Spinner /> : "Update"}
              </button>
            </>
          )}
        />
      </form>
    </div>
  );
};

export default CategoryEditForm;
