import React from "react";
import { Link } from "@tanstack/react-router";
import { Pie, PieChart } from "recharts";
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
import { buttonVariants } from "../ui/button";
import { ArrowBigLeftDash, ArrowBigRightDash } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";

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
  const t = useTranslation("review");

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
          className={buttonVariants({ variant: "secondary" })}
        >
          <ArrowBigLeftDash /> {formatYearMonth(prev)}
        </Link>
        <h1 className="text-2xl text-center font-bold mb-4">
          {formatYearMonth(date)}
        </h1>
        <Link
          to="/review/$year/$month"
          params={{ year: next.year.toString(), month: next.month.toString() }}
          className={buttonVariants({ variant: "secondary" })}
        >
          {formatYearMonth(next)} <ArrowBigRightDash />
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
              </TableRow>
            </TableHeader>
            <TableBody>
              {rowsWithTotal.map((row, idx) => (
                <TableRow key={idx} className={cn(striped(idx))}>
                  <TableCell className="text-center">{row.category}</TableCell>
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

export default ReviewMonth;
