import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import ReviewMonths from "~/components/Review/ReviewMonths";
import { reviewMonthsQueryOptions } from "~/service/review";

export const Route = createFileRoute("/_app/review/$year/")({
  component: RouteComponent,
  loader: async ({ params, context }) => {
    return await context.queryClient.ensureQueryData(
      reviewMonthsQueryOptions(params.year),
    );
  },
});

function RouteComponent() {
  const { year } = Route.useParams();
  const { data } = useSuspenseQuery(reviewMonthsQueryOptions(year));

  return (
    <div>
      <ReviewMonths year={year} data={data} />
    </div>
  );
}
