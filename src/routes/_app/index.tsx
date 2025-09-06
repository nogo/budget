import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router"
import { z } from "zod";
import MonthlyList from "~/components/budget/monthly-list";
import TransactionForm from "~/components/budget/transaction-form";
import { yearMonthNow } from "~/lib/yearmonth";
import { transactionQueries } from "~/service/queries";

const searchSchema = z.object({
  q: z.string().optional(),
});

export const Route = createFileRoute("/_app/")({
  component: YearMonthComponent,
  validateSearch: searchSchema,
  loaderDeps: ({ search: { q } }) => ({ search: q }),
  loader: async ({ context, deps: { search } }) => {
    const currentMonthYear = yearMonthNow();
    await context.queryClient.ensureQueryData(transactionQueries.list(currentMonthYear, search));
    
    return {
      currentMonthYear,
      search
    }
  },
});

function YearMonthComponent() {
  const { currentMonthYear, search } = Route.useLoaderData();
  const { data: transactions } = useSuspenseQuery(transactionQueries.list(currentMonthYear, search))

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
