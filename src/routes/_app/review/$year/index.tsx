import { createFileRoute } from "@tanstack/react-router";
import ReviewMonths from "~/components/review/review-months";
import { handleIdStringArray } from "~/lib/utils";
import { reviewQueries } from "~/service/queries";
import { ReviewSearchSchema } from "~/service/review.schema";

export const Route = createFileRoute("/_app/review/$year/")({
  component: RouteComponent,
  validateSearch: ReviewSearchSchema,
  loaderDeps: ({ search: { categories } }) => ({
    categories,
  }),
  loader: async ({ params, context, deps: { categories } }) => {
    const yearNumber = parseInt(params.year)
      ? parseInt(params.year)
      : new Date().getFullYear();

    const catIds = handleIdStringArray(categories);

    return {
      data: await context.queryClient.fetchQuery(reviewQueries.year(yearNumber, catIds)),
      categoryIds: catIds,
      yearNumber,
    };
  },
});

function RouteComponent() {
  const { data, categoryIds, yearNumber } = Route.useLoaderData();

  return <ReviewMonths data={data} year={yearNumber} categoryIds={categoryIds} />;
}
