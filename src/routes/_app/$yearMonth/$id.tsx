import { createFileRoute } from "@tanstack/react-router";
import { parseYearMonth } from "~/lib/yearmonth";
import MonthlyList from "~/components/Budget/MonthlyList";
import TransactionForm from "~/components/Budget/TransactionForm";
import { transactionQueries } from "~/service/queries";

export const Route = createFileRoute("/_app/$yearMonth/$id")({
  component: YearMonthItemEdit,
  loader: async ({ context, params: { id, yearMonth } }) => {
    const currentMonthYear = parseYearMonth(yearMonth);

    return {
      transactions: await context.queryClient.fetchQuery(
        transactionQueries.list(currentMonthYear),
      ),
      transaction: await context.queryClient.fetchQuery(
        transactionQueries.detail(id),
      ),
    };
  },
});

function YearMonthItemEdit() {
  const { id, yearMonth } = Route.useParams();
  const currentMonthYear = parseYearMonth(yearMonth);
  const { transactions, transaction } = Route.useLoaderData();

  return (
    <>
      <div className="w-full md:w-1/5">
        <div
          className="sticky top-0 bg-white p-6 border shadow-md"
          style={{ top: "calc(4rem + 1rem)" }}
        >
          <TransactionForm
            currentMonthYear={currentMonthYear}
            transaction={transaction || null}
          />
        </div>
      </div>
      <div className="w-full md:w-4/5 relative">
        <MonthlyList
          transactions={transactions}
          currentMonthYear={currentMonthYear}
          selectedTransactionId={id}
        />
      </div>
    </>
  );
}
