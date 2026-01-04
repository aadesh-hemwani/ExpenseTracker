import { useMemo } from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import { Expense } from "../types";

interface CategoryDonutChartProps {
  expenses: Expense[];
}

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const { name, value } = payload[0];
    return (
      <div className="glass p-4 rounded-2xl shadow-2xl ring-1 ring-black/5">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-tertiary uppercase tracking-wider">
            {name}
          </span>
          <span className="text-xl font-bold text-primary">
            ₹{value.toLocaleString("en-IN")}
          </span>
        </div>
      </div>
    );
  }
  return null;
};

import { CATEGORY_COLORS } from "../utils/uiUtils";

const CategoryDonutChart = ({ expenses }: CategoryDonutChartProps) => {
  const data = useMemo(() => {
    if (!expenses || expenses.length === 0) return [];

    const categoryTotals: Record<string, number> = {};

    expenses.forEach((expense) => {
      const category = expense.category || "Uncategorized";
      categoryTotals[category] =
        (categoryTotals[category] || 0) + Number(expense.amount);
    });

    return Object.entries(categoryTotals)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value); // Sort by highest spend
  }, [expenses]);

  if (data.length === 0) return null;

  return (
    <div className="w-full h-80 bg-surface rounded-3xl p-6 border border-subtle shadow-sm mb-6">
      <h3 className="text-lg font-bold text-primary mb-4">
        Spending by Category
      </h3>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={70}
              outerRadius={90}
              paddingAngle={4}
              dataKey="value"
              stroke="none"
              cornerRadius={6}
            >
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={CATEGORY_COLORS[entry.name] || "#64748b"}
                  className="stroke-transparent outline-none"
                />
              ))}
            </Pie>
            <Tooltip
              content={<CustomTooltip />}
              cursor={false}
              animationDuration={500}
            />
            <Legend
              verticalAlign="middle"
              align="right"
              layout="vertical"
              iconType="circle"
              iconSize={8}
              wrapperStyle={{
                paddingLeft: "20px",
                fontSize: "12px",
                color: "hsl(var(--text-tertiary))",
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default CategoryDonutChart;
