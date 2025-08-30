import CategoryEditForm from "~/components/category/category-edit-form";
import {
  ErrorComponent,
  ErrorComponentProps,
  createFileRoute,
} from "@tanstack/react-router";
import { NotFound } from "~/components/NotFound";
import { categoryQueries } from "~/service/queries";
import { useTranslation } from "~/locales/translations";

export const Route = createFileRoute("/_app/categories/$categoryId/edit")({
  component: RouteComponent,
  loader: async ({ params: { categoryId }, context }) => {
    const data = await context.queryClient.ensureQueryData(
      categoryQueries.detail(categoryId),
    );
    return data;
  },
  notFoundComponent: () => {
    return <NotFound>Category not found</NotFound>;
  },
});

function RouteComponent() {
  const category = Route.useLoaderData();
  const t = useTranslation("Categories");

  if (!category) {
    return <NotFound>Category not found</NotFound>;
  }

  return (
    <div className="grid grid-cols-1 border border-gray-300 shadow-md">
      <h1 className="p-2 text-center font-bold">{t("editCategory")}</h1>
      <CategoryEditForm category={category} />
    </div>
  );
}

export function CategoryErrorComponent({ error }: ErrorComponentProps) {
  return <ErrorComponent error={error} />;
}
