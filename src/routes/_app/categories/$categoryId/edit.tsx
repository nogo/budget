import CategoryEditForm from "~/components/Category/CategoryEditForm";
import {
  createFileRoute,
  ErrorComponent,
  ErrorComponentProps,
} from "@tanstack/react-router";
import { categoryQueryOptions } from "~/service/categories";
import { NotFound } from "~/components/NotFound";
import { useSuspenseQuery } from "@tanstack/react-query";

export const Route = createFileRoute("/_app/categories/$categoryId/edit")({
  component: RouteComponent,
  loader: async ({ params: { categoryId }, context }) => {
    const data = await context.queryClient.ensureQueryData(
      categoryQueryOptions(categoryId),
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
  const categoryQuery = useSuspenseQuery(categoryQueryOptions(categoryId));
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
