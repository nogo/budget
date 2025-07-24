import { createFileRoute } from "@tanstack/react-router";
import ReviewMonths from "~/components/Review/ReviewMonths";
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

    if (catIds && catIds.length > 0) {
      return await context.queryClient.fetchQuery(reviewQueries.yearWithCategories(yearNumber, catIds));
    }
    return await context.queryClient.fetchQuery(reviewQueries.year(yearNumber));
  },
});

function RouteComponent() {
  const { year } = Route.useParams();
  const { categories } = Route.useSearch();
  const yearNumber = parseInt(year) ? parseInt(year) : new Date().getFullYear();
  const data = Route.useLoaderData();

  return <ReviewMonths year={yearNumber} data={data} categoryIds={handleIdStringArray(categories)} />;
}
