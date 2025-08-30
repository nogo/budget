import { Link, useNavigate } from "@tanstack/react-router";
import React from "react";
import { formatCurrency } from "~/lib/format";
import { cn, colored, striped } from "~/lib/utils";
import { useTranslation } from "~/locales/translations";
import IncomeExpenseChart from "./income-expense-chart";
import CategoryFilter from "./category-filter";
import { buttonVariants } from "../ui/button";
import { ArrowBigLeftDash, ArrowBigRightDash, BarChart3, List } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { ToggleGroup, ToggleGroupItem } from "../ui/toggle-group";

type YearlyDataRow = {
  month: number;
  income: number;
  expense: number;
  total: number;
};

type YearlyProps = {
  year: number;
  data: YearlyDataRow[];
  categoryIds?: number[];
};

const ReviewMonths: React.FC<YearlyProps> = ({ year, data, categoryIds = [] }) => {
  const t = useTranslation("Review");
  const navigate = useNavigate();

  const rowsWithTotal = data.map((row) => ({
    ...row,
    total: Math.abs(row.income) - Math.abs(row.expense),
  }));
  const nextYear = Number(year) + 1;
  const prevYear = Number(year) - 1;

  // Compute accumulated total
  let runningSum = 0;
  const rowsWithAccumulated = rowsWithTotal.map((row) => {
    runningSum += row.total;
    return { ...row, accumulated: runningSum };
  });

  const totalIncome = rowsWithTotal.reduce(
    (sum, row) => sum + Number(row.income) || 0,
    0,
  );
  const totalExpense = rowsWithTotal.reduce(
    (sum, row) => sum + Number(row.expense) || 0,
    0,
  );
  const totalTotal = rowsWithTotal.reduce((sum, row) => sum + row.total, 0);

  const handleCategoryChange = (newCategoryIds: number[]) => {
    const searchParams = newCategoryIds.length > 0
      ? { categories: newCategoryIds.join(',') }
      : {};

    navigate({
      to: "/review/$year",
      params: { year: year.toString() },
      search: searchParams,
    });
  };

  const buildYearLink = (targetYear: number) => {
    const searchParams = categoryIds.length > 0
      ? { categories: categoryIds.join(',') }
      : {};

    return {
      to: "/review/$year" as const,
      params: { year: targetYear.toString() },
      search: searchParams,
    };
  };

  const buildMonthLink = (month: number) => {
    const searchParams = categoryIds.length > 0
      ? { categories: categoryIds.join(',') }
      : {};

    return {
      to: "/review/$year/$month" as const,
      params: {
        year: year.toString(),
        month: month.toString()
      },
      search: searchParams,
    };
  };

  return (
    <>
      <div className="flex justify-between">
        <Link
          {...buildYearLink(prevYear)}
          className={buttonVariants({ variant: "secondary" })}
        >
          <ArrowBigLeftDash /> {prevYear}
        </Link>
        <h1 className="text-2xl text-center font-bold mb-4">{year}</h1>
        <Link
          {...buildYearLink(nextYear)}
          className={buttonVariants({ variant: "secondary" })}
        >
          {nextYear} <ArrowBigRightDash />
        </Link>
      </div>

      <CategoryFilter
        selectedCategoryIds={categoryIds}
        onCategoryChange={handleCategoryChange}
      />
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <IncomeExpenseChart data={rowsWithAccumulated} />
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-semibold text-center">
                  {t("month")}
                </TableHead>
                <TableHead className="font-semibold text-right">
                  {t("income")}
                </TableHead>
                <TableHead className="font-semibold text-right">
                  {t("expense")}
                </TableHead>
                <TableHead className="font-semibold text-right">
                  {t("total")}
                </TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rowsWithTotal.map((row, idx) => (
                <TableRow key={idx} className={cn(striped(idx))}>
                  <TableCell className="text-center">
                    <Link
                      {...buildMonthLink(row.month)}
                      title="View month review"
                      className={buttonVariants({ variant: "outline" })}
                    >
                      <BarChart3 className="h-3 w-3 mr-1" />{row.month}
                    </Link></TableCell>
                  <TableCell className="text-right font-mono">
                    {formatCurrency(row.income)}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatCurrency(row.expense)}
                  </TableCell>
                  <TableCell
                    className={cn(colored(row.total), "text-right font-mono")}
                  >
                    {formatCurrency(row.total)}
                  </TableCell>
                  <TableCell className="flex justify-center">
                    <Link
                      to="/$yearMonth"
                      params={{ yearMonth: `${year}-${String(row.month).padStart(2, '0')}` }}
                      className={buttonVariants({ variant: "outline" })}
                      title={t("viewTransactions")}
                    >
                      <List className="h-3 w-3" />
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow className="font-bold border-t-2">
                <TableCell className="text-center">{t("total")}</TableCell>
                <TableCell className="text-right font-mono">
                  {formatCurrency(totalIncome)}
                </TableCell>
                <TableCell className="text-right font-mono">
                  {formatCurrency(totalExpense)}
                </TableCell>
                <TableCell
                  className={cn(colored(totalTotal), "text-right font-mono")}
                >
                  {formatCurrency(totalTotal)}
                </TableCell>
                <TableCell></TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </div>
      </div>
    </>
  );
};

export default ReviewMonths;
