import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, useSearch } from "@tanstack/react-router";
import ReviewYears from "~/components/review/review-years";
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
    await context.queryClient.fetchQuery(reviewQueries.years(handleIdStringArray(categories)))
  },
});

function YearReviewComponent() {
  const { categories } = Route.useSearch();

  const categoryIds = handleIdStringArray(categories);
  const { data } = useSuspenseQuery(reviewQueries.years(categoryIds))


  return <ReviewYears data={data} categoryIds={categoryIds} />;
}
