import { useSuspenseQuery } from "@tanstack/react-query";
import CategoryAddForm from "~/components/Category/CategoryAddForm";
import CategoryItem from "~/components/Category/CategoryItem";
import { useTranslation } from "~/locales/translations";
import { categoryQueries } from "~/service/queries";

export const Route = createFileRoute({
  component: RouteComponent,
  loader: async ({ context }) => await context.queryClient.ensureQueryData(categoryQueries.list()),
});

function RouteComponent() {
  const { data: categories } = useSuspenseQuery(categoryQueries.list());
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
