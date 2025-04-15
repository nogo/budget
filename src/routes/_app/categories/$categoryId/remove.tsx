import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { NotFound } from "~/components/NotFound";
import { categoryQueryOptions, removeCategory } from "~/service/categories";

export const Route = createFileRoute("/_app/categories/$categoryId/remove")({
  component: RouteComponent,
  loader: async ({ params: { categoryId }, context }) => {
    const data = await context.queryClient.ensureQueryData(
      categoryQueryOptions(categoryId),
    );
    return data;
  },
  notFoundComponent: () => {
    return <NotFound>Category not found</NotFound>;
  },
});

function RouteComponent() {
  const { categoryId } = Route.useParams();
  const { data: category, isLoading } = useSuspenseQuery(
    categoryQueryOptions(categoryId),
  );
  const router = useRouter();

  if (isLoading || !category) return <div>Loading</div>;

  const deleteCategory = useMutation({
    mutationKey: ["remove-category", category.id],
    mutationFn: async () => {
      await removeCategory({ data: category.id });
    },
    onSuccess: () => {
      router.invalidate();
      router.navigate({ to: "/categories" });
    },
  });

  return (
    <div className="flex flex-col justify-center p-4">
      <h1 className="text-center text-2xl font-bold">
        You are about to remove {category.name}?
      </h1>
      <div className="flex grow-1 justify-between">
        <button
          onClick={() => deleteCategory.mutate()}
          className="mt-4 rounded-full bg-red-500 px-4 py-2 font-bold text-white hover:bg-red-700"
        >
          Yes, remove {category.name}
        </button>
        <button
          onClick={() => router.navigate({ to: "/categories" })}
          className="mt-4 rounded-full bg-gray-500 px-4 py-2 font-bold text-white hover:bg-gray-700"
        >
          No, keep {category.name}
        </button>
      </div>
    </div>
  );
}
