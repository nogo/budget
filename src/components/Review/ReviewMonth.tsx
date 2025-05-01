import { Link } from "@tanstack/react-router";
import React from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import { useTranslation } from "~/locales/translations";
import { formatCurrency } from "~/lib/format";
import { cn, colored, colorFromString, striped } from "~/lib/utils";
import {
  formatYearMonth,
  nextYearMonth,
  previousYearMonth,
  YearMonth,
} from "~/lib/yearmonth";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "../ui/chart";

type CategoryMonthDataRow = {
  category: string;
  income: number;
  expense: number;
  total: number;
};

type CategoryMonthProps = {
  date: YearMonth;
  data: CategoryMonthDataRow[];
};

const ReviewMonth: React.FC<CategoryMonthProps> = ({ date, data }) => {
  const t = useTranslation("Review");

  const prev = previousYearMonth(date);
  const next = nextYearMonth(date);

  const chartConfig = {} satisfies ChartConfig;

  const rowsWithTotal = data;

  const totalTotal = rowsWithTotal.reduce(
    (sum, row) => sum + Number(row.total),
    0,
  );

  const chartData = data
    .filter((item) => item.expense > 0.0)
    //.sort((a, b) => b.expense - a.expense)
    .map((item) => {
      return {
        name: item.category,
        value: Math.floor(item.expense),
        fill: colorFromString(item.category),
      };
    });

  const totalIncome = rowsWithTotal.reduce(
    (sum, row) => sum + Number(row.income) || 0,
    0,
  );
  const totalExpense = rowsWithTotal.reduce(
    (sum, row) => sum + Number(row.expense) || 0,
    0,
  );

  return (
    <>
      <div className="flex justify-between">
        <Link
          to="/review/$year/$month"
          params={{ year: prev.year.toString(), month: prev.month.toString() }}
          className="px-4 py-2 bg-gray-200 hover:bg-gray-300"
        >
          &larr; {formatYearMonth(prev)}
        </Link>
        <h1 className="text-2xl text-center font-bold mb-4">
          {formatYearMonth(date)}
        </h1>
        <Link
          to="/review/$year/$month"
          params={{ year: next.year.toString(), month: next.month.toString() }}
          className="px-4 py-2 bg-gray-200 hover:bg-gray-300"
        >
          {formatYearMonth(next)} &rarr;
        </Link>
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <div className="w-full my-8 p-3 border border-gray-300 shadow-md">
          <ChartContainer config={chartConfig}>
            <PieChart>
              <ChartTooltip
                content={<ChartTooltipContent nameKey="name" hideLabel />}
              />
              <Pie
                data={chartData}
                nameKey="name"
                dataKey="value"
                labelLine={false}
                label={({ payload, ...props }) => {
                  return (
                    <text
                      cx={props.cx}
                      cy={props.cy}
                      x={props.x}
                      y={props.y}
                      textAnchor={props.textAnchor}
                      dominantBaseline={props.dominantBaseline}
                      fill="var(--foreground)"
                    >
                      {payload.name}
                    </text>
                  );
                }}
              />
            </PieChart>
          </ChartContainer>
        </div>
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
                    {row.category}
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
      </div>
    </>
  );
};

export default ReviewMonth;
