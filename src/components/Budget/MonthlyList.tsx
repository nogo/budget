import React, { useState, useEffect, useRef, useCallback } from "react";
import MonthlyListItem from "./MonthlyListItem";
import {
  formatYearMonth,
  nextYearMonth,
  previousYearMonth,
  YearMonth,
} from "~/lib/yearmonth";
import { Transaction } from "~/service/transactions.api";
import dayjs from "dayjs";
import { formatCurrency } from "~/lib/format";
import { ChevronLeft, ChevronRight, Search, X, ArrowRight } from "lucide-react";
import { Link, useNavigate, useSearch, useRouterState } from "@tanstack/react-router";
import { buttonVariants } from "../ui/button";
import { cn, colored } from "~/lib/utils";
import { useTranslation } from "~/locales/translations";
import SearchForm from "./budget-search";

interface MonthlyListProps {
  transactions: Array<Transaction>;
  currentMonthYear: YearMonth;
  selectedTransactionId?: string;
  searchQuery?: string
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
  searchQuery
}) => {
  const t = useTranslation("budget");
  const previousMonth = formatYearMonth(previousYearMonth(currentMonthYear));
  const nextMonth = formatYearMonth(nextYearMonth(currentMonthYear));


  // All filtering is now done server-side, just use the transactions directly
  const displayTransactions = transactions;
  const total = calculateTotal(displayTransactions);
  const groupedTransactions: GroupedTransactions = displayTransactions.reduce(
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
          {/* Unified Search and Filter */}
          <div className="px-3 py-2 border-b border-gray-300 bg-gray-50">
            <SearchForm query={searchQuery} />
            {/* Search results info */}
            {searchQuery?.trim() && (
              <div className="text-xs text-gray-500 mt-1">
                {displayTransactions.length} {displayTransactions.length === 1 ? t("transaction") : t("transactions")}
              </div>
            )}
          </div>

          <h1 className="border-b-1 border-gray-300 px-3 py-2 text-center font-bold">
            {formatYearMonth(currentMonthYear)}
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
                  searchQuery={searchQuery}
                />
              ))}
            </React.Fragment>
          ))}
        </div>
      </div>

      <div className="sticky bottom-0 right-4 border-t-1 space-x-4  z-10 bg-white">
        <div className="flex justify-between p-4">
          <Link
            to="/$yearMonth"
            params={{ yearMonth: previousMonth }}
            className={buttonVariants({ variant: "secondary" })}
          >
            <ChevronLeft /> {previousMonth}
          </Link>

          <span className={cn("text-right font-mono", colored(total))}>
            {total !== 0 ? formatCurrency(total) : ""}
          </span>

          <Link
            to="/$yearMonth"
            params={{ yearMonth: nextMonth }}
            className={buttonVariants({ variant: "secondary" })}
          >
            {nextMonth} <ChevronRight />
          </Link>
        </div>
      </div>
    </>
  );
};

export default MonthlyList;
