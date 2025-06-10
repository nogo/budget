import { Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  formatYearMonth,
  nextYearMonth,
  previousYearMonth,
  YearMonth,
} from "~/lib/yearmonth";
import { buttonVariants } from "../ui/button";

export interface Props {
  currentMonthYear: YearMonth;
}

const MonthlyListNav: React.FC<Props> = ({ currentMonthYear }) => {
  const previous = formatYearMonth(previousYearMonth(currentMonthYear));
  const next = formatYearMonth(nextYearMonth(currentMonthYear));

  return (
    <div className="flex justify-between p-4">
      <Link
        to="/$yearMonth"
        params={{ yearMonth: previous }}
        className={buttonVariants({ variant: "secondary" })}
      >
        <ChevronLeft /> {previous}
      </Link>
      <Link
        to="/$yearMonth"
        params={{ yearMonth: next }}
        className={buttonVariants({ variant: "secondary" })}
      >
        {next} <ChevronRight />
      </Link>
    </div>
  );
};

export default MonthlyListNav;
