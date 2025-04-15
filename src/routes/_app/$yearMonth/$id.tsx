import { parseYearMonth, YearMonth, yearMonthNow } from "~/utils/yearmonth";
import { createFileRoute } from "@tanstack/react-router";
import MonthlyList from "~/components/Budget/MonthlyList";
import TransactionForm from "~/components/Budget/TransactionForm";
import {
  findTransactionsQueryOptions,
  listTransactionsQueryOptions,
} from "~/service/transactions";
import { useSuspenseQuery } from "@tanstack/react-query";

export const Route = createFileRoute("/_app/$yearMonth/$id")({
  component: YearMonthItemEdit,
  beforeLoad: async ({ params }) => {
    const yearMonth = parseYearMonth(params.yearMonth);
    return { currentMonthYear: yearMonth ? yearMonth : yearMonthNow() };
  },
  loader: async ({ context, params: { id } }) => {
    return Promise.all([
      context.queryClient.ensureQueryData(
        listTransactionsQueryOptions(context.currentMonthYear),
      ),
      context.queryClient.ensureQueryData(findTransactionsQueryOptions(id)),
    ]);
  },
});

function YearMonthItemEdit() {
  const { currentMonthYear } = Route.useRouteContext();
  const { id } = Route.useParams();

  const transactionsQuery = useSuspenseQuery(
    listTransactionsQueryOptions(currentMonthYear),
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
