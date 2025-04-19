import { createFileRoute } from "@tanstack/react-router";
import ReviewYearMonth from "~/components/Review/ReviewYearMonth";

export const Route = createFileRoute("/_app/review/$year/")({
  component: RouteComponent,
});

function RouteComponent() {
  // Generate test data for 12 months
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  const testData = months.map((month, i) => {
    // For demonstration, let's say in March, July, and November, expenses are higher than income
    let income = 2000 + i * 100;
    let expense = 1500 + i * 80;
    if (["March", "July", "November"].includes(month)) {
      expense = income + 300 + i * 20; // expense > income
    }
    return {
      month: i + 1, // change from month name to month number (1-based)
      income,
      expense,
      total: 0, // will be recalculated in the component
    };
  });

  return (
    <div>
      <ReviewYearMonth year={2024} data={testData} />
    </div>
  );
}
