import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import ReviewYearMonth from "~/components/Review/ReviewYearMonth";
import { reviewYearMonthQueryOptions } from "~/service/review";

export const Route = createFileRoute("/_app/review/$year/")({
  component: RouteComponent,
  loader: async ({ params, context }) => {
    return await context.queryClient.ensureQueryData(
      reviewYearMonthQueryOptions(params.year),
    );
  },
});

function RouteComponent() {
  const { year } = Route.useParams();
  const { data: reviewYearMonth } = useSuspenseQuery(
    reviewYearMonthQueryOptions(year),
  );

  return (
    <div>
      <ReviewYearMonth year={year} data={reviewYearMonth} />
    </div>
  );
}
