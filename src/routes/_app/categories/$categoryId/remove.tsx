import { useRouter, createFileRoute } from "@tanstack/react-router";
import { NotFound } from "~/components/layout/not-found";
import { Button } from "~/components/ui/button";
import { useTranslation } from "~/locales/translations";
import { categoryQueries, useRemoveCategoryMutation } from "~/service/queries";

export const Route = createFileRoute("/_app/categories/$categoryId/remove")({
  component: RouteComponent,
  loader: async ({ params: { categoryId }, context }) => {
    // Validate categoryId parameter before using it
    const numericId = Number(categoryId);
    if (isNaN(numericId) || numericId <= 0) {
      throw new Error(`Invalid category ID: ${categoryId}`);
    }

    return await context.queryClient.fetchQuery(
      categoryQueries.detail(categoryId),
    );
  },
  notFoundComponent: () => {
    return <NotFound>Category not found</NotFound>;
  },
});

function RouteComponent() {
  const category = Route.useLoaderData();
  const router = useRouter();
  const t = useTranslation("Categories");

  if (!category) return <div>Loading</div>;

  const removeMutation = useRemoveCategoryMutation();

  return (
    <div className="flex flex-col justify-center p-4">
      <h1 className="text-center text-2xl font-bold">
        {t("removeQuestion", [category.name])}
      </h1>
      <div className="flex grow-1 justify-between">
        <Button
          variant="destructive"
          onClick={() => {
            removeMutation.mutate({ data: { id: category.id } });
            router.navigate({ to: "/categories" });
          }}
        >
          {t("yesRemove", [category.name])}
        </Button>
        <Button
          variant="secondary"
          onClick={() => router.navigate({ to: "/categories" })}
        >
          {t("noKeep", [category.name])}
        </Button>
      </div>
    </div>
  );
}
