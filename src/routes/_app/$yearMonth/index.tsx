import { Navigate } from "@tanstack/react-router";
import { parseYearMonth, yearMonthNow } from "~/lib/yearmonth";
import TransactionForm from "~/components/Budget/TransactionForm";
import MonthlyList from "~/components/Budget/MonthlyList";
import { useSuspenseQuery } from "@tanstack/react-query";
import { transactionQueries } from "~/service/queries";

export const Route = createFileRoute({
  component: YearMonthComponent,
  beforeLoad: async ({ params }) => {
    const yearMonth = parseYearMonth(params.yearMonth);
    return { currentMonthYear: yearMonth ? yearMonth : yearMonthNow() };
  },
  loader: async ({ context }) => {
    return await context.queryClient.ensureQueryData(transactionQueries.list(context.currentMonthYear));
  },
});

function YearMonthComponent() {
  const { currentMonthYear } = Route.useRouteContext();

  if (!currentMonthYear) {
    return <Navigate from="/$yearMonth" to="/" replace={true} />;
  }

  const transactionQuery = useSuspenseQuery(transactionQueries.list(currentMonthYear));
  const transactions = transactionQuery.data;

  return (
    <div className="flex flex-col gap-4 md:flex-row">
      <TransactionForm currentMonthYear={currentMonthYear} />
      <MonthlyList
        transactions={transactions}
        currentMonthYear={currentMonthYear}
      />
    </div>
  );
}
