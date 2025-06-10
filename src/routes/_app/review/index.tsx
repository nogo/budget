import { createFileRoute } from "@tanstack/react-router";
import ReviewYears from "~/components/Review/ReviewYears";
import { reviewQueries } from "~/service/queries";

export const Route = createFileRoute("/_app/review/")({
  component: RouteComponent,
  loader: async ({ context }) => {
    return await context.queryClient.fetchQuery(reviewQueries.years());
  },
});

function RouteComponent() {
  const data = Route.useLoaderData();

  return <ReviewYears data={data} />;
}
