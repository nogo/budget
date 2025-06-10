import { createFileRoute } from "@tanstack/react-router"
import { useSuspenseQuery } from "@tanstack/react-query";
import ReviewMonths from "~/components/Review/ReviewMonths";
import { reviewQueries } from "~/service/queries";

export const Route = createFileRoute("/_app/review/$year/")({
  component: RouteComponent,
  loader: async ({ params, context }) => {
    return await context.queryClient.ensureQueryData(
      reviewQueries.year(params.year),
    );
  },
});

function RouteComponent() {
  const { year } = Route.useParams();
  const { data } = useSuspenseQuery(reviewQueries.year(year));

  return (
    <div>
      <ReviewMonths year={year} data={data} />
    </div>
  );
}
