import { createFileRoute } from "@tanstack/react-router";
import ReviewYears from "~/components/Review/ReviewYears";
import { handleIdStringArray } from "~/lib/utils";
import { reviewQueries } from "~/service/queries";
import { ReviewSearchSchema } from "~/service/review.schema";

export const Route = createFileRoute("/_app/review/")({
  component: YearReviewComponent,
  validateSearch: ReviewSearchSchema,
  loaderDeps: ({ search: { categories } }) => ({
    categories,
  }),
  loader: async ({ context, deps: { categories } }) => {
    const catIds = handleIdStringArray(categories);

    if (catIds && catIds.length > 0) {
      return await context.queryClient.fetchQuery(reviewQueries.yearsWithCategories(catIds));
    }
    return await context.queryClient.fetchQuery(reviewQueries.years());
  },
});

function YearReviewComponent() {
  const data = Route.useLoaderData();
  const { categories } = Route.useSearch();
  
  return <ReviewYears data={data} categoryIds={handleIdStringArray(categories)} />;
}
