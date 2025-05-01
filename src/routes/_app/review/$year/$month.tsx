import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import ReviewMonth from "~/components/Review/ReviewMonth";
import { reviewCategoryMonthQueryOptions } from "~/service/review";
import { parseYearMonth } from "~/lib/yearmonth";

export const Route = createFileRoute("/_app/review/$year/$month")({
  component: RouteComponent,
  loader: async ({ params, context }) => {
    return await context.queryClient.ensureQueryData(
      reviewCategoryMonthQueryOptions(params.year, params.month),
    );
  },
});

function RouteComponent() {
  const { year, month } = Route.useParams();
  const { data } = useSuspenseQuery(
    reviewCategoryMonthQueryOptions(year, month),
  );
  const date = parseYearMonth(year + "-" + month.padStart(2, "0"));

  return (
    <div>
      <ReviewMonth date={date} data={data} />
    </div>
  );
}
