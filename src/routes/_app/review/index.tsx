import { useSuspenseQuery } from "@tanstack/react-query";
import ReviewYears from "~/components/Review/ReviewYears";
import { reviewQueries } from "~/service/queries";

export const Route = createFileRoute({
  component: RouteComponent,
  loader: async ({ context }) => {
    return await context.queryClient.ensureQueryData(reviewQueries.years());
  },
});

function RouteComponent() {
  const { data: reviewYears } = useSuspenseQuery(reviewQueries.years());

  return (
    <div>
      <ReviewYears data={reviewYears} />
    </div>
  );
}
