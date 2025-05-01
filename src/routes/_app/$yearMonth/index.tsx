import { createFileRoute, Navigate } from "@tanstack/react-router";
import { parseYearMonth, yearMonthNow } from "~/lib/yearmonth";
import TransactionForm from "~/components/Budget/TransactionForm";
import MonthlyList from "~/components/Budget/MonthlyList";
import { listTransactionsQueryOptions } from "~/service/transactions";
import { useSuspenseQuery } from "@tanstack/react-query";

export const Route = createFileRoute("/_app/$yearMonth/")({
  component: YearMonthComponent,
  beforeLoad: async ({ params }) => {
    const yearMonth = parseYearMonth(params.yearMonth);
    return { currentMonthYear: yearMonth ? yearMonth : yearMonthNow() };
  },
  loader: async ({ context }) => {
    return await context.queryClient.ensureQueryData(
      listTransactionsQueryOptions(context.currentMonthYear),
    );
  },
});

function YearMonthComponent() {
  const { currentMonthYear } = Route.useRouteContext();

  if (!currentMonthYear) {
    return <Navigate from="/$yearMonth" to="/" replace={true} />;
  }

  const transactionQuery = useSuspenseQuery(
    listTransactionsQueryOptions(currentMonthYear),
  );
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
