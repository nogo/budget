import React, { useState, useEffect, useRef, useCallback } from "react";
import MonthlyListItem from "./MonthlyListItem";
import {
  formatYearMonth,
  nextYearMonth,
  previousYearMonth,
  YearMonth,
} from "~/lib/yearmonth";
import { Transaction, listTransactions } from "~/service/transactions.api";
import dayjs from "dayjs";
import { formatCurrency } from "~/lib/format";
import { ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { buttonVariants } from "../ui/button";
import { cn, colored } from "~/lib/utils";
import { useTranslation } from "~/locales/translations";

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
  const t = useTranslation("budget");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Array<Transaction> | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const previousMonth = formatYearMonth(previousYearMonth(currentMonthYear));
  const nextMonth = formatYearMonth(nextYearMonth(currentMonthYear));
  
  // Parse search query for categories and text
  const parseSearchQuery = useCallback((query: string) => {
    // Use Unicode word characters to support German umlauts (ä, ö, ü, ß)
    const categoryMatches = query.match(/#([\p{L}\p{N}_]+)/giu) || [];
    const hashtagCategories = categoryMatches.map(match => match.substring(1).toLowerCase());
    
    // Find actual category names (partial match, case insensitive)
    const categories = hashtagCategories.flatMap(hashtagCat => {
      const matchingTransactions = transactions.filter(t => 
        t.category && t.category.toLowerCase().includes(hashtagCat)
      );
      // Get unique category names that match
      const uniqueCategories = [...new Set(matchingTransactions.map(t => t.category).filter((cat): cat is string => Boolean(cat)))];
      return uniqueCategories;
    });
    
    const textQuery = query.replace(/#[\p{L}\p{N}_]+/giu, '').trim();
    
    return { categories, textQuery };
  }, [transactions]);

  const performSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults(null);
      setSelectedCategories(new Set());
      return;
    }

    const { categories, textQuery } = parseSearchQuery(query);
    
    // Update selected categories based on hashtags
    setSelectedCategories(new Set(categories));

    // Only perform API search if there's actual text to search
    if (!textQuery) {
      setSearchResults(null);
      return;
    }

    try {
      const results = await listTransactions({
        data: {
          monthYear: formatYearMonth(currentMonthYear),
          query: textQuery,
        }
      });
      setSearchResults(results);
    } catch (error) {
      console.error("Search failed:", error);
      setSearchResults([]);
    }
  }, [currentMonthYear, parseSearchQuery]);

  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (!query.trim()) {
      setSearchResults(null);
      setSelectedCategories(new Set()); // Clear categories immediately when search is cleared
      return;
    }

    searchTimeoutRef.current = setTimeout(() => {
      performSearch(query);
    }, 300);
  }, [performSearch]);

  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  // Apply category filter to search results or original transactions
  const baseTransactions = searchResults || transactions;
  const displayTransactions = selectedCategories.size === 0 
    ? baseTransactions
    : baseTransactions.filter(t => t.category && selectedCategories.has(t.category));
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
            <div className="relative">
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                <Search />
              </div>
              <input
                type="text"
                placeholder={t("searchPlaceholder")}
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full pl-9 pr-8 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {searchQuery && (
                <button
                  onClick={() => handleSearchChange("")}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 text-lg leading-none"
                  type="button"
                >
                  <X />
                </button>
              )}
            </div>

            {/* Search results info */}
            {(searchQuery.trim() || selectedCategories.size > 0) && (
              <div className="text-xs text-gray-500 mt-1">
                {t("showing")} {displayTransactions.length} {displayTransactions.length === 1 ? t("transaction") : t("transactions")}
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
