import { Link, useNavigate } from "@tanstack/react-router";
import { formatCurrency } from "~/lib/format";
import { cn } from "~/lib/utils";
import IncomeExpenseChart from "./IncomeExpenseChart";
import CategoryFilter from "./CategoryFilter";
import { useTranslation } from "~/locales/translations";
import { buttonVariants } from "../ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { BarChart3 } from "lucide-react";

type YearlyDataRow = {
  year: number;
  income: number;
  expense: number;
  total: number;
};

type YearlyProps = {
  data: YearlyDataRow[];
  categoryIds?: number[];
};

const ReviewYears: React.FC<YearlyProps> = ({ data, categoryIds = [] }) => {
  const t = useTranslation("Review");
  const navigate = useNavigate();

  const rowsWithTotal = data.map((row) => ({
    ...row,
    total: Math.abs(row.income) - Math.abs(row.expense),
  }));

  // Compute accumulated total
  let runningSum = 0;
  const rowsWithAccumulated = rowsWithTotal.map((row) => {
    runningSum += row.total;
    return { ...row, accumulated: runningSum };
  });

  const totalIncome = rowsWithTotal.reduce(
    (sum, row) => sum + (Number(row.income) || 0),
    0,
  );
  const totalExpense = rowsWithTotal.reduce(
    (sum, row) => sum + (Number(row.expense) || 0),
    0,
  );
  const totalTotal = rowsWithTotal.reduce((sum, row) => sum + row.total, 0);

  const striped = (index: number) => {
    return index % 2 === 0 ? "bg-gray-100" : "";
  };

  const colored = (value: number) => {
    return value < 0 ? "text-red-600" : "text-green-600";
  };

  const handleCategoryChange = (newCategoryIds: number[]) => {
    const searchParams = newCategoryIds.length > 0
      ? { categories: newCategoryIds.join(',') }
      : {};

    navigate({
      to: "/review",
      search: searchParams,
    });
  };

  const buildYearLink = (year: number) => {
    const searchParams = categoryIds.length > 0
      ? { categories: categoryIds.join(',') }
      : {};

    return {
      to: "/review/$year" as const,
      params: { year: year.toString() },
      search: searchParams,
    };
  };

  return (
    <>
      <h1 className="text-2xl text-center font-bold mb-4">
        {t("reviewTitle")}
      </h1>

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
                  {t("year")}
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
              </TableRow>
            </TableHeader>
            <TableBody>
              {rowsWithTotal.map((row, idx) => (
                <TableRow key={idx}>
                  <TableCell className="text-center">
                    <Link
                      {...buildYearLink(row.year)}
                      className={buttonVariants({ variant: "outline" })}
                    >
                      <BarChart3 className="h-3 w-3 mr-1" />
                      {row.year}
                    </Link>
                  </TableCell>
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
              </TableRow>
            </TableFooter>
          </Table>
        </div>
      </div>
    </>
  );
};

export default ReviewYears;
