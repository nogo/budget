import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import ReviewMonth from "~/components/Review/ReviewMonth";
import { parseYearMonth } from "~/lib/yearmonth";
import { reviewQueries } from "~/service/queries";

export const Route = createFileRoute("/_app/review/$year/$month")({
  component: RouteComponent,
  loader: async ({ params, context }) => {
    return await context.queryClient.ensureQueryData(
      reviewQueries.month(params.year, params.month),
    );
  },
});

function RouteComponent() {
  const { year, month } = Route.useParams();
  const { data } = useSuspenseQuery(reviewQueries.month(year, month));
  const date = parseYearMonth(year + "-" + month.padStart(2, "0"));

  return <ReviewMonth date={date} data={data} />;
}
