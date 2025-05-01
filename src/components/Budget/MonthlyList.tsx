import React from "react";
import MonthlyListItem from "./MonthlyListItem";
import { Link } from "@tanstack/react-router";
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/solid";
import {
  formatYearMonth,
  nextYearMonth,
  previousYearMonth,
  YearMonth,
} from "~/lib/yearmonth";
import { Transaction } from "~/service/transactions";
import dayjs from "dayjs";
import { formatCurrency } from "~/lib/format";
import { cn } from "~/lib/utils";

interface MonthlyListProps {
  transactions: Array<Transaction>;
  currentMonthYear: YearMonth;
  selectedTransactionId?: string;
}

interface GroupedTransactions {
  [date: string]: Array<Transaction>;
}

const calculateTotal = (data: Array<Transaction>) => {
  if (!data) return 0;

  return data.reduce((sum, item) => {
    return sum + (item.type === "expense" ? -item.amount : item.amount);
  }, 0);
};

const calculateDayTotal = (transactions: Array<Transaction>) => {
  if (!transactions || transactions.length <= 1) return <></>;

  const total = calculateTotal(transactions);

  const amountClass = total < 0 ? "text-red-300" : "text-green-300";

  return (
    <span className={cn(amountClass, "font-mono text-sm")}>
      {formatCurrency(total)}
    </span>
  );
};

const MonthlyList: React.FC<MonthlyListProps> = ({
  transactions,
  currentMonthYear,
  selectedTransactionId,
}) => {
  const previous = formatYearMonth(previousYearMonth(currentMonthYear));
  const next = formatYearMonth(nextYearMonth(currentMonthYear));

  const total = calculateTotal(transactions);

  const groupedTransactions: GroupedTransactions = transactions.reduce(
    (acc, transaction) => {
      const date = dayjs(transaction.date).format("DD.MM.YYYY");
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(transaction);
      return acc;
    },
    {} as GroupedTransactions,
  );

  return (
    <div className="mb-4 md:flex-[1_2_20%]">
      <div className="grid grid-cols-1 border border-gray-300 shadow-md">
        <h1 className="grid grid-cols-3 items-end border-b-1 border-gray-300 px-3 py-2 text-center font-bold">
          <span></span>
          {formatYearMonth(currentMonthYear)}
          <span className="text-right font-mono text-sm text-gray-400">
            {total !== 0 ? formatCurrency(total) : ""}
          </span>
        </h1>
        {Object.keys(groupedTransactions).map((date) => (
          <React.Fragment key={date}>
            <h2 className="flex items-end justify-between border-b border-gray-300 px-3 py-2 font-semibold">
              {date}
            </h2>
            {groupedTransactions[date].map((item) => (
              <MonthlyListItem
                key={item.id}
                transaction={item}
                selected={item.id.toString() === selectedTransactionId}
              />
            ))}
          </React.Fragment>
        ))}
      </div>

      <div className="flex justify-between border-t border-gray-300 p-2">
        <Link
          to="/$yearMonth"
          params={{ yearMonth: previous }}
          className="md flex bg-gray-400 px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-gray-500 focus-visible:bg-gray-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-600"
        >
          <ChevronLeftIcon className="h-5" /> {previous}
        </Link>
        <Link
          to="/$yearMonth"
          params={{ yearMonth: next }}
          className="md flex justify-end bg-gray-400 px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-gray-500 focus-visible:bg-gray-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-600"
        >
          {next} <ChevronRightIcon className="h-5" />
        </Link>
      </div>
    </div>
  );
};

export default MonthlyList;
