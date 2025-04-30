import { Link } from "@tanstack/react-router";
import React from "react";
import { formatCurrency } from "~/utils/format";
import { cn } from "~/utils/utils";
import {
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Line,
  CartesianGrid,
  ComposedChart,
} from "recharts";
import { useTranslation } from "~/locales/translations";
import IncomeExpenseChart from "./IncomeExpenseChart";

type YearlyDataRow = {
  month: number;
  income: number;
  expense: number;
  total: number;
};

type YearlyProps = {
  year: number;
  data: YearlyDataRow[];
};

const ReviewYearMonth: React.FC<YearlyProps> = ({ year, data }) => {
  const t = useTranslation("Review");

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

  const striped = (index: number) => {
    return index % 2 === 0 ? "bg-gray-100" : "";
  };

  const colored = (value: number) => {
    return value < 0 ? "text-red-600" : "text-green-600";
  };

  return (
    <>
      <div className="flex justify-between">
        <Link
          to="/review/$year"
          params={{ year: String(prevYear) }}
          className="px-4 py-2 bg-gray-200 hover:bg-gray-300"
        >
          &larr; {prevYear}
        </Link>
        <h1 className="text-2xl text-center font-bold mb-4">{year}</h1>
        <Link
          to="/review/$year"
          params={{ year: String(nextYear) }}
          className="px-4 py-2 bg-gray-200 hover:bg-gray-300"
        >
          {nextYear} &rarr;
        </Link>
      </div>
      <IncomeExpenseChart data={rowsWithAccumulated} t={t} height={400} />
      <div className="overflow-x-auto">
        <table className="min-w-full shadow-sm">
          <thead>
            <tr className="border-b-2 border-gray-300">
              <th className="md:px-4 md:py-2 text-center font-semibold">
                {t("month")}
              </th>
              <th className="md:px-4 md:py-2 font-semibold text-right">
                {t("income")}
              </th>
              <th className="md:px-4 md:py-2 font-semibold text-right">
                {t("expense")}
              </th>
              <th className="md:px-4 md:py-2 font-semibold text-right">
                {t("total")}
              </th>
            </tr>
          </thead>
          <tbody>
            {rowsWithTotal.map((row, idx) => (
              <tr
                key={idx}
                className={cn(
                  striped(idx),
                  "border-b border-gray-300 hover:bg-gray-100 transition-colors duration-200",
                )}
              >
                <td className="md:px-4 md:py-2 text-center">
                  <Link
                    to="/review/$year/$month"
                    params={{
                      year: year.toString(),
                      month: row.month.toString(),
                    }}
                  >
                    {row.month}
                  </Link>
                </td>
                <td className="md:px-4 md:py-2 text-right font-mono">
                  {formatCurrency(row.income)}
                </td>
                <td className="md:px-4 md:py-2 text-right font-mono">
                  {formatCurrency(row.expense)}
                </td>
                <td
                  className={cn(
                    colored(row.total),
                    "md:px-4 md:py-2 text-right font-mono",
                  )}
                >
                  {formatCurrency(row.total)}
                </td>
              </tr>
            ))}
            <tr className="font-bold border-t-2 border-gray-300">
              <td className="md:px-4 md:py-2 text-center">{t("total")}</td>
              <td className="md:px-4 md:py-2 text-right font-mono">
                {formatCurrency(totalIncome)}
              </td>
              <td className="md:px-4 md:py-2 text-right font-mono">
                {formatCurrency(totalExpense)}
              </td>
              <td
                className={cn(
                  colored(totalTotal),
                  "md:px-4 md:py-2 text-right font-mono",
                )}
              >
                {formatCurrency(totalTotal)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </>
  );
};

export default ReviewYearMonth;
