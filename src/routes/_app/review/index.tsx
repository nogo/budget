import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import ReviewYears from "~/components/Review/ReviewYears";
import { ReviewYear, reviewYearsQueryOptions } from "~/service/review";

export const Route = createFileRoute("/_app/review/")({
  component: RouteComponent,
  loader: async ({ context }) => {
    return await context.queryClient.ensureQueryData(reviewYearsQueryOptions());
  },
});

function RouteComponent() {
  const { data: reviewYears } = useSuspenseQuery(reviewYearsQueryOptions());

  return (
    <div>
      <ReviewYears data={reviewYears} />
    </div>
  );
}
