import CategoryAddForm from "~/components/Category/CategoryAddForm";
import CategoryItem from "~/components/Category/CategoryItem";
import { createFileRoute } from "@tanstack/react-router";
import { listCategories } from "~/service/categories";
import { useTranslation } from "~/locales/translations";

export const Route = createFileRoute("/_app/categories/")({
  component: RouteComponent,
  loader: async () => listCategories(),
});

function RouteComponent() {
  const categories = Route.useLoaderData();
  const t = useTranslation();

  return (
    <div className="mb-4 md:flex-[1_2_20%]">
      <div className="grid grid-cols-1 border border-gray-300 shadow-md">
        <h1 className="p-2 text-center font-bold">{t("categories")}</h1>
        <CategoryAddForm />
        {categories.map((category) => (
          <CategoryItem key={category.id} category={category} />
        ))}
      </div>
    </div>
  );
}
