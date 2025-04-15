import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import MonthlyList from "~/components/Budget/MonthlyList";
import TransactionForm from "~/components/Budget/TransactionForm";
import { listTransactionsQueryOptions } from "~/service/transactions";
import { yearMonthNow } from "~/utils/yearmonth";

export const Route = createFileRoute("/_app/")({
  component: RouteComponent,
  beforeLoad: async () => {
    return { currentMonthYear: yearMonthNow() };
  },
  loader: async ({ context }) => {
    return await context.queryClient.ensureQueryData(
      listTransactionsQueryOptions(context.currentMonthYear),
    );
  },
});

function RouteComponent() {
  const { currentMonthYear } = Route.useRouteContext();

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
