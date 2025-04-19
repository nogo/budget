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

  const totalIncome = rowsWithTotal.reduce((sum, row) => sum + row.income, 0);
  const totalExpense = rowsWithTotal.reduce((sum, row) => sum + row.expense, 0);
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
          params={{ year: String(year - 1) }}
          className="px-4 py-2 bg-gray-200 hover:bg-gray-300"
        >
          &larr; {year - 1}
        </Link>
        <h1 className="text-2xl text-center font-bold mb-4">{year}</h1>

        <Link
          to="/review/$year"
          params={{ year: String(year + 1) }}
          className="px-4 py-2 bg-gray-200 hover:bg-gray-300"
        >
          {year + 1} &rarr;
        </Link>
      </div>
      <div
        className="w-full my-8 p-3 border border-gray-300 shadow-md"
        style={{ height: 320 }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={rowsWithAccumulated}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip formatter={(value: number) => formatCurrency(value)} />
            <Bar dataKey="total" barSize={20} fill="#733e0a" name="Net Total" />
            <Line
              type="monotone"
              dataKey="accumulated"
              stroke="#0074d9"
              strokeWidth={3}
              dot={false}
              name="Accumulated Total"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full shadow-sm">
          <thead>
            <tr className="border-b-2 border-gray-300">
              <th className="px-4 py-2 text-left font-semibold">Month</th>
              <th className="px-4 py-2 font-semibold text-right">Income</th>
              <th className="px-4 py-2 font-semibold text-right">Expense</th>
              <th className="px-4 py-2 font-semibold text-right">Total</th>
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
                <td className="px-4 py-2">
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
                <td className="px-4 py-2 text-right font-mono">
                  {formatCurrency(row.income)}
                </td>
                <td className="px-4 py-2 text-right font-mono">
                  {formatCurrency(row.expense)}
                </td>
                <td
                  className={cn(
                    colored(row.total),
                    "px-4 py-2 text-right font-mono",
                  )}
                >
                  {formatCurrency(row.total)}
                </td>
              </tr>
            ))}
            <tr className="font-bold border-t-2 border-gray-300">
              <td className="px-4 py-2">Total</td>
              <td className="px-4 py-2 text-right font-mono">
                {formatCurrency(totalIncome)}
              </td>
              <td className="px-4 py-2 text-right font-mono">
                {formatCurrency(totalExpense)}
              </td>
              <td
                className={cn(
                  colored(totalTotal),
                  "px-4 py-2 text-right font-mono",
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
