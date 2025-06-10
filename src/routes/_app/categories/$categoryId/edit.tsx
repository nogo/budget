import CategoryEditForm from "~/components/Category/CategoryEditForm";
import { ErrorComponent, ErrorComponentProps, createFileRoute } from "@tanstack/react-router";
import { NotFound } from "~/components/NotFound";
import { useSuspenseQuery } from "@tanstack/react-query";
import { categoryQueries } from "~/service/queries";

export const Route = createFileRoute("/_app/categories/$categoryId/edit")({
  component: RouteComponent,
  loader: async ({ params: { categoryId }, context }) => {
    const data = await context.queryClient.ensureQueryData(
      categoryQueries.detail(categoryId),
    );
    return data;
  },
  //errorComponent: CategoryErrorComponent,
  notFoundComponent: () => {
    return <NotFound>Category not found</NotFound>;
  },
});

function RouteComponent() {
  const { categoryId } = Route.useParams();
  const categoryQuery = useSuspenseQuery(categoryQueries.detail(categoryId));
  const category = categoryQuery.data;

  return (
    <>
      <CategoryEditForm category={category} />
    </>
  );
}

export function CategoryErrorComponent({ error }: ErrorComponentProps) {
  return <ErrorComponent error={error} />;
}
