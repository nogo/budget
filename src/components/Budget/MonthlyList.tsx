import React from "react";
import MonthlyListItem from "./MonthlyListItem";
import { Link } from "@tanstack/react-router";
import {
  formatYearMonth,
  nextYearMonth,
  previousYearMonth,
  YearMonth,
} from "~/lib/yearmonth";
import { Transaction } from "~/service/transactions.api";
import dayjs from "dayjs";
import { formatCurrency } from "~/lib/format";
import { cn } from "~/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { buttonVariants } from "../ui/button";
import MonthlyListNav from "./MonthlyListNav";

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

const MonthlyList: React.FC<MonthlyListProps> = ({
  transactions,
  currentMonthYear,
  selectedTransactionId,
}) => {
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
    <>
      <div className="mb-4 md:flex-[1_2_20%] relative overflow-auto">
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
      </div>

      <div className="sticky bottom-0 right-4 border-t-1 space-x-4  z-10 bg-white">
        <MonthlyListNav currentMonthYear={currentMonthYear} />
      </div>
    </>
  );
};

export default MonthlyList;
