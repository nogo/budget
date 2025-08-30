import React, { useState } from "react";
import {
  Bar,
  XAxis,
  YAxis,
  Line,
  CartesianGrid,
  ComposedChart,
  Brush,
} from "recharts";
import { useTranslation } from "~/locales/translations";
import { formatCurrencyWhole } from "~/lib/format";
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "../ui/chart";

type IncomeExpenseChartProps = {
  data: any[];
};

const IncomeExpenseChart: React.FC<IncomeExpenseChartProps> = ({
  data: chartData,
}) => {
  const t = useTranslation("review");
  const dataX = "year" in chartData[0] ? "year" : "month";
  const [showAccumulated, setShowAccumulated] = useState(false);

  const hasMultipleBarsWithValues = chartData.some(item =>
    (item.income > 0 || item.income < 0) && (item.expense > 0 || item.expense < 0)
  );

  const chartConfig = {
    income: {
      label: t("income"),
      color: "var(--chart-1)",
    },
    expense: {
      label: t("expense"),
      color: "var(--chart-2)",
    },
    accumulated: {
      label: t("accumulatedTotal"),
      color: "var(--chart-3)",
    },
  } satisfies ChartConfig;

  return (
    <>
      <div className="w-full my-8 p-3 border border-gray-300 shadow-md">
        <ChartContainer config={chartConfig}>
          <ComposedChart accessibilityLayer data={chartData}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey={dataX} tickMargin={3} />
            <YAxis 
              tickFormatter={(value) => formatCurrencyWhole(value)}
            />
            <ChartLegend content={<ChartLegendContent payload={[]} />} />
            <ChartTooltip
              content={<ChartTooltipContent />}
            />
            <Bar dataKey="income" fill="var(--color-income)" radius={4} />
            <Bar dataKey="expense" fill="var(--color-expense)" radius={4} />
            {hasMultipleBarsWithValues && showAccumulated && (
              <Line
                dataKey="accumulated"
                type="monotone"
                stroke="var(--color-accumulated)"
                strokeWidth={4}
                dot={false}
              />
            )}
          </ComposedChart>
        </ChartContainer>
        {hasMultipleBarsWithValues && (
          <div className="text-right">
            <input
              type="checkbox"
              id="showAccumulated"
              checked={showAccumulated}
              onChange={(e) => setShowAccumulated(e.target.checked)}
              className="mr-2"
            />
            <label htmlFor="showAccumulated" className="text-sm">
              {t("accumulatedTotal")}
            </label>
          </div>
        )}
      </div>


    </>
  );
};

export default IncomeExpenseChart;
