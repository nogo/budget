import { useSuspenseQuery } from "@tanstack/react-query";
import MonthlyList from "~/components/Budget/MonthlyList";
import TransactionForm from "~/components/Budget/TransactionForm";
import { yearMonthNow } from "~/lib/yearmonth";
import { transactionQueries } from "~/service/queries";

export const Route = createFileRoute({
  component: RouteComponent,
  beforeLoad: async () => {
    return { currentMonthYear: yearMonthNow() };
  },
  loader: async ({ context }) => {
    return await context.queryClient.ensureQueryData(
      transactionQueries.list(context.currentMonthYear),
    );
  },
});

function RouteComponent() {
  const { currentMonthYear } = Route.useRouteContext();
  const { data: transactions } = useSuspenseQuery(
    transactionQueries.list(currentMonthYear),
  );

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
