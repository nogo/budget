import React from "react";
import {
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Line,
  CartesianGrid,
  ComposedChart,
  Legend,
  Brush,
} from "recharts";
import { formatCurrency } from "~/utils/format";

type IncomeExpenseChartProps = {
  data: any[];
  t: (key: string) => string;
  height?: number;
};

const IncomeExpenseChart: React.FC<IncomeExpenseChartProps> = ({
  data,
  t,
  height = 400,
}) => (
  <div
    className="w-full my-8 p-3 border border-gray-300 shadow-md"
    style={{ height }}
  >
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={data}>
        <CartesianGrid stroke="#ccc" strokeDasharray="3 3" />
        <XAxis dataKey={"year" in data[0] ? "year" : "month"} />
        <YAxis />
        <Legend verticalAlign="top" />
        <Bar dataKey="income" barSize={20} fill="#31b763" name={t("income")} />
        <Bar
          dataKey="expense"
          barSize={20}
          fill="#e7000b"
          name={t("expense")}
        />
        <Line
          type="monotone"
          dataKey="accumulated"
          stroke="#733e0a"
          strokeWidth={3}
          dot={false}
          name={t("accumulatedTotal")}
        />
        <Brush
          dataKey={"year" in data[0] ? "year" : "month"}
          height={30}
          stroke="#733e0a"
        />
        <Tooltip formatter={(value: number) => formatCurrency(value)} />
      </ComposedChart>
    </ResponsiveContainer>
  </div>
);

export default IncomeExpenseChart;
