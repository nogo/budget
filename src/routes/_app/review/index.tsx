import { createFileRoute } from "@tanstack/react-router";
import ReviewYears from "~/components/Review/ReviewYears";

export const Route = createFileRoute("/_app/review/")({
  component: RouteComponent,
});

function RouteComponent() {
  // Generate test data for years 2010 to 2025, no months
  const years = Array.from({ length: 2025 - 2010 + 1 }, (_, y) => 2010 + y);

  // Generate data: [{ year, income, expense, total }]
  const testData = years.map((year, idx) => {
    // Vary income and expense by year for realism
    const income = 2200 + (year - 2010) * 70 + Math.round(Math.random() * 400);
    let expense = 1700 + (year - 2010) * 60 + Math.round(Math.random() * 350);

    // For every 4th year, make expense higher than income
    if ((year - 2010) % 4 === 0) {
      expense = income + 200 + Math.round(Math.random() * 200);
    }

    return {
      year,
      income,
      expense,
      total: 0, // will be recalculated in the component
    };
  });

  return (
    <div>
      <ReviewYears data={testData} />
    </div>
  );
}
