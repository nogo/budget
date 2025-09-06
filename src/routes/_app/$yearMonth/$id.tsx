import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { parseYearMonth } from "~/lib/yearmonth";
import MonthlyList from "~/components/budget/monthly-list";
import TransactionForm from "~/components/budget/transaction-form";
import { transactionQueries } from "~/service/queries";

const searchSchema = z.object({
  q: z.string().optional(),
});

export const Route = createFileRoute("/_app/$yearMonth/$id")({
  component: YearMonthItemEdit,
  validateSearch: searchSchema,
  loaderDeps: ({ search: { q } }) => ({ search: q }),
  loader: async ({ context, params: { id, yearMonth }, deps: { search } }) => {
    const currentMonthYear = parseYearMonth(yearMonth);
    
    // Validate ID parameter before using it
    const numericId = Number(id);
    if (isNaN(numericId) || numericId <= 0) {
      throw new Error(`Invalid transaction ID: ${id}`);
    }

    return {
      currentMonthYear,
      search,
      transactions: await context.queryClient.fetchQuery(
        transactionQueries.list(currentMonthYear, search),
      ),
      transaction: await context.queryClient.fetchQuery(
        transactionQueries.detail(id),
      ),
    };
  },
});

function YearMonthItemEdit() {
  const { id } = Route.useParams();
  const { currentMonthYear, search, transactions, transaction } = Route.useLoaderData();

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
          searchQuery={search}
        />
      </div>
    </>
  );
}
