import { Navigate, createFileRoute } from "@tanstack/react-router";
import { parseYearMonth, yearMonthNow } from "~/lib/yearmonth";
import TransactionForm from "~/components/Budget/TransactionForm";
import MonthlyList from "~/components/Budget/MonthlyList";
import { transactionQueries } from "~/service/queries";
import MonthlyListNav from "~/components/Budget/MonthlyListNav";

export const Route = createFileRoute("/_app/$yearMonth/")({
  component: YearMonthComponent,
  beforeLoad: async ({ params }) => {
    const yearMonth = parseYearMonth(params.yearMonth);
    return { currentMonthYear: yearMonth ? yearMonth : yearMonthNow() };
  },
  loader: async ({ context }) => {
    return await context.queryClient.fetchQuery(
      transactionQueries.list(context.currentMonthYear),
    );
  },
});

function YearMonthComponent() {
  const { currentMonthYear } = Route.useRouteContext();

  if (!currentMonthYear) {
    return <Navigate from="/$yearMonth" to="/" replace={true} />;
  }

  const transactions = Route.useLoaderData();

  return (
    <>
      <div className="w-full md:w-1/5">
        <div
          className="sticky top-0 bg-white p-6 border shadow-md"
          style={{ top: "calc(4rem + 1rem)" }}
        >
          <TransactionForm currentMonthYear={currentMonthYear} />
        </div>
      </div>
      <div className="w-full md:w-4/5 relative">
        <MonthlyList
          transactions={transactions}
          currentMonthYear={currentMonthYear}
        />
      </div>
    </>
  );
}
