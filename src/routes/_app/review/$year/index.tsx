import { createFileRoute } from "@tanstack/react-router";
import ReviewMonths from "~/components/Review/ReviewMonths";
import { reviewQueries } from "~/service/queries";

export const Route = createFileRoute("/_app/review/$year/")({
  component: RouteComponent,
  loader: async ({ params, context }) => {
    const yearNumber = parseInt(params.year)
      ? parseInt(params.year)
      : new Date().getFullYear();

    return await context.queryClient.fetchQuery(reviewQueries.year(yearNumber));
  },
});

function RouteComponent() {
  const { year } = Route.useParams();
  const yearNumber = parseInt(year) ? parseInt(year) : new Date().getFullYear();
  const data = Route.useLoaderData();

  return <ReviewMonths year={yearNumber} data={data} />;
}
