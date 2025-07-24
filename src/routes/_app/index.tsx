import { createFileRoute } from "@tanstack/react-router"
import MonthlyList from "~/components/Budget/MonthlyList";
import TransactionForm from "~/components/Budget/TransactionForm";
import { yearMonthNow } from "~/lib/yearmonth";
import { transactionQueries } from "~/service/queries";

export const Route = createFileRoute("/_app/")({
  component: YearMonthComponent,
  loader: async ({ context }) => {
    const currentMonthYear = yearMonthNow();

    return {
      currentMonthYear,
      transactions: await context.queryClient.fetchQuery(
        transactionQueries.list(currentMonthYear),
      )
    }
  },
});


function YearMonthComponent() {
  const { currentMonthYear, transactions } = Route.useLoaderData();

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
        />
      </div>
    </>
  );
}
