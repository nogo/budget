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
    return {
      data: await context.queryClient.fetchQuery(reviewQueries.years(catIds)),
      categoryIds: catIds,
    };
  },
});

function YearReviewComponent() {
  const { data, categoryIds } = Route.useLoaderData();

  return <ReviewYears data={data} categoryIds={categoryIds} />;
}
