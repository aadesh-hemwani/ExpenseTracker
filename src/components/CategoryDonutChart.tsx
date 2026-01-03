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
      <div className="backdrop-blur-xl bg-white/80 dark:bg-black/60 border border-white/20 dark:border-white/10 p-4 rounded-2xl shadow-2xl ring-1 ring-black/5">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            {name}
          </span>
          <span className="text-xl font-bold text-gray-900 dark:text-white">
            ₹{value.toLocaleString("en-IN")}
          </span>
        </div>
      </div>
    );
  }
  return null;
};

const COLORS = [
  "#6366f1", // Indigo
  "#10b981", // Emerald
  "#f43f5e", // Rose
  "#f59e0b", // Amber
  "#8b5cf6", // Violet
  "#06b6d4", // Cyan
  "#ec4899", // Pink
  "#14b8a6", // Teal
  "#f97316", // Orange
  "#64748b", // Slate
];

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
    <div className="w-full h-80 bg-white dark:bg-black rounded-3xl p-6 border border-gray-100 dark:border-gray-800 shadow-sm mb-6">
      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
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
              {data.map((_, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={COLORS[index % COLORS.length]}
                  className="stroke-transparent outline-none"
                />
              ))}
            </Pie>
            <Tooltip
              content={<CustomTooltip />}
              cursor={false}
              animationDuration={200}
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
                color: "#9ca3af",
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default CategoryDonutChart;
