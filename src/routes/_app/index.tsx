import { createFileRoute, redirect } from "@tanstack/react-router"
import { formatYearMonth, yearMonthNow } from "~/lib/yearmonth";

export const Route = createFileRoute("/_app/")({
  loader: () => {
    const currentMonthYear = formatYearMonth(yearMonthNow());

    return redirect({ to: "/$yearMonth", params: { yearMonth: currentMonthYear }});
  }
});
