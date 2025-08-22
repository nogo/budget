import { Navigate, createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { parseYearMonth } from "~/lib/yearmonth";
import TransactionForm from "~/components/Budget/TransactionForm";
import MonthlyList from "~/components/Budget/MonthlyList";
import { transactionQueries } from "~/service/queries";

const searchSchema = z.object({
  q: z.string().optional(),
});

export const Route = createFileRoute("/_app/$yearMonth/")({
  component: YearMonthComponent,
  validateSearch: searchSchema,
  loaderDeps: ({ search: { q } }) => ({ search: q }),
  loader: async ({ context, params, deps: { search } }) => {
    const currentMonthYear = parseYearMonth(params.yearMonth);

    return {
      currentMonthYear,
      search,
      transactions: await context.queryClient.fetchQuery(
        transactionQueries.list(currentMonthYear, search),
      )
    }
  },
});

function YearMonthComponent() {
  const { currentMonthYear, search, transactions } = Route.useLoaderData();
  if (!currentMonthYear) {
    return <Navigate from="/$yearMonth" to="/" replace={true} />;
  }

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
          searchQuery={search}
        />
      </div>
    </>
  );
}
