import { parseYearMonth, yearMonthNow } from "~/lib/yearmonth";
import MonthlyList from "~/components/Budget/MonthlyList";
import TransactionForm from "~/components/Budget/TransactionForm";
import { useSuspenseQuery } from "@tanstack/react-query";
import { transactionQueries } from "~/service/queries";

export const Route = createFileRoute({
  component: YearMonthItemEdit,
  beforeLoad: async ({ params }) => {
    const yearMonth = parseYearMonth(params.yearMonth);
    return { currentMonthYear: yearMonth ? yearMonth : yearMonthNow() };
  },
  loader: async ({ context, params: { id } }) => {
    return Promise.all([
      context.queryClient.ensureQueryData(
        transactionQueries.list(context.currentMonthYear),
      ),
      context.queryClient.ensureQueryData(transactionQueries.detail(id)),
    ]);
  },
});

function YearMonthItemEdit() {
  const { currentMonthYear } = Route.useRouteContext();
  const { id } = Route.useParams();

  const transactionsQuery = useSuspenseQuery(
    transactionQueries.list(currentMonthYear),
  );
  const transactions = transactionsQuery.data;

  const transactionQuery = useSuspenseQuery(findTransactionsQueryOptions(id));
  const transaction = transactionQuery.data;

  return (
    <div className="flex flex-col gap-4 md:flex-row">
      <TransactionForm
        currentMonthYear={currentMonthYear}
        transaction={transaction || null}
      />
      <MonthlyList
        transactions={transactions}
        currentMonthYear={currentMonthYear}
        selectedTransactionId={id}
      />
    </div>
  );
}
