import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import ReviewMonth from "~/components/review/review-month";
import { parseYearMonth } from "~/lib/yearmonth";
import { reviewQueries } from "~/service/queries";

export const Route = createFileRoute("/_app/review/$year/$month")({
  component: RouteComponent,
  loader: async ({ params, context }) => {
    const yearNumber = parseInt(params.year)
      ? parseInt(params.year)
      : new Date().getFullYear();
    const monthNumber = parseInt(params.month)
      ? parseInt(params.month)
      : new Date().getMonth() + 1;

    return await context.queryClient.ensureQueryData(
      reviewQueries.month(yearNumber, monthNumber),
    );
  },
});

function RouteComponent() {
  const { year, month } = Route.useParams();
  const yearNumber = parseInt(year) ? parseInt(year) : new Date().getFullYear();
  const monthNumber = parseInt(month) ? parseInt(month) : new Date().getMonth() + 1;
  const { data } = useSuspenseQuery(reviewQueries.month(yearNumber, monthNumber));
  const date = parseYearMonth(year + "-" + month.padStart(2, "0"));

  return <ReviewMonth date={date} data={data} />;
}
