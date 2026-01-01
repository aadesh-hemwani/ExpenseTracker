import { useMemo, useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import {
  useMonthlyStats,
  useExpensesForMonth,
  useExpenses,
} from "../hooks/useExpenses";
import { getCategoryBreakdown } from "../utils/analyticsHelpers";
import { getCategoryIcon } from "../utils/uiUtils";
import { format, subMonths } from "date-fns";
import { ArrowUpRight, PieChart, BarChart2Icon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "../context/ThemeContext";
import CountUp from "../components/CountUp";
import { useAuth } from "../context/AuthContext";
import { db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";
import Card from "../components/Card";
import ExpenseListModal from "../components/ExpenseListModal";
import AiInsights from "../components/AiInsights";
import { generateInsights } from "../utils/insights";

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

const formatCurrency = (val: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(val);

// Custom Tooltip Component for Recharts
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-black p-3 border border-gray-100 dark:border-gray-800 shadow-xl rounded-xl">
        <p className="text-xs text-gray-400 font-semibold mb-1">{label}</p>
        <p className="text-lg font-bold text-gray-900 dark:text-white">
          {formatCurrency(payload[0].value)}
        </p>
      </div>
    );
  }
  return null;
};

const Analytics = () => {
  const { user } = useAuth();
  // 1. Get High-Level Stats for Trend Chart
  const { stats } = useMonthlyStats();

  // 2. Get Detailed Expenses for Current Month (for Category Breakdown)
  // We default to the current month for the "Insight" view
  // @ts-ignore
  const [targetDate, setTargetDate] = useState<Date>(new Date());
  const { expenses: monthlyExpenses, loading } = useExpensesForMonth(
    targetDate,
    stats,
    true,
    false
  );

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const handleCategoryClick = (category: string) => {
    setSelectedCategory(category);
  };

  const handleCloseModal = () => {
    setSelectedCategory(null);
  };

  const { theme, accentColor, accentColors } = useTheme();
  const [budget, setBudget] = useState(0);

  useEffect(() => {
    const fetchBudget = async () => {
      if (user?.uid) {
        const userRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(userRef);
        if (docSnap.exists()) {
          setBudget(docSnap.data().monthlyBudgetCap || 0);
        }
      }
    };
    fetchBudget();
  }, [user]);

  // AUTO-SYNC STATS Logic
  const { updateMonthlyStat } = useExpenses();
  useEffect(() => {
    if (loading) return; // Wait for expenses to load

    const currentMonthKey = format(targetDate, "yyyy-MM");
    // Calculate true totals from actual expenses
    const trueTotal = monthlyExpenses.reduce(
      (sum, item) => sum + Number(item.amount),
      0
    );
    const trueCount = monthlyExpenses.length;

    // Find cached stat
    const cachedStat = stats.find((s: any) => s.monthKey === currentMonthKey);

    // Compare and Update if needed
    if (
      !cachedStat ||
      cachedStat.total !== trueTotal ||
      cachedStat.count !== trueCount
    ) {
      console.log(`Auto-Syncing Stats for ${currentMonthKey}...`);
      console.log(`Cached: ${cachedStat?.total}, True: ${trueTotal}`);
      updateMonthlyStat(currentMonthKey, trueTotal, trueCount);
    }
  }, [monthlyExpenses, stats, loading, targetDate, updateMonthlyStat]);

  // A. Prepare Data for "Monthly Trend" (Last 6 Months) from 'stats'
  const monthlyData = useMemo(() => {
    const last6 = [];
    const today = new Date();
    for (let i = 5; i >= 0; i--) {
      const date = subMonths(today, i);
      const key = format(date, "yyyy-MM");
      // @ts-ignore
      const data = stats.find((s) => s.monthKey === key);
      last6.push({
        name: format(date, "MMM"),
        total: data ? data.total : 0,
        key: key,
      });
    }
    return last6;
  }, [stats]);

  // B. Prepare Data for "Category Breakdown" (Current Month Only)
  const categoryData = useMemo(
    () => getCategoryBreakdown(monthlyExpenses),
    [monthlyExpenses]
  );

  // Current Month KPI (Calculated from detailed expenses for accuracy/liveliness)
  const currentMonthTotal = useMemo(() => {
    return monthlyExpenses.reduce((sum, item) => sum + Number(item.amount), 0);
  }, [monthlyExpenses]);

  // Generate AI Insights
  const insights = useMemo(() => {
    return generateInsights(
      stats as any,
      monthlyExpenses,
      currentMonthTotal,
      budget
    );
  }, [stats, monthlyExpenses, currentMonthTotal, budget]);

  const topCategory = categoryData[0];

  // Chart Colors based on Theme
  const gridColor = theme === "dark" ? "#374151" : "#f3f4f6";
  const cursorColor = theme === "dark" ? "#1f2937" : "#f9fafb";
  const textColor = "#9ca3af";

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-8 pt-4"
    >
      {/* Header */}
      <motion.div variants={item}>
        <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white">
          Insights
        </h1>
        <p className="text-gray-500 mt-2">Visualize your spending patterns.</p>
      </motion.div>

      {/* KPI Cards */}
      <motion.div variants={item} className="grid grid-cols-2 gap-4">
        <motion.div
          whileTap={{ scale: 0.98 }}
          transition={{ type: "spring", stiffness: 400, damping: 17 }}
          className="p-5 bg-gradient-to-br from-accent to-purple-900 dark:to-purple-400 text-white rounded-2xl shadow-lg"
        >
          <div className="flex justify-between items-start mb-4">
            <span className="text-xs font-medium dark:text-gray-950 uppercase tracking-wider">
              This Month
            </span>
            <ArrowUpRight className="w-4 h-4 dark:text-gray-950" />
          </div>
          <div className="text-4xl font-bold">
            <CountUp value={currentMonthTotal} />
          </div>
        </motion.div>

        <Card className="rounded-2xl p-5">
          <div className="flex justify-between items-start mb-4">
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
              Top Category
            </span>
            <PieChart className="w-4 h-4 text-gray-400" />
          </div>
          <div className="text-xl font-bold text-gray-900 dark:text-white truncate">
            {topCategory ? topCategory.name : "—"}
          </div>
          <div className="text-sm text-gray-500 mt-1">
            {topCategory ? formatCurrency(topCategory.value) : "No data"}
          </div>
        </Card>
      </motion.div>

      {/* Budget Progress Card */}
      {budget > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="p-6">
            <div className="flex justify-between items-end mb-2">
              <div>
                <p className="text-sm font-medium text-gray-400 uppercase tracking-wider">
                  Monthly Budget
                </p>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {formatCurrency(currentMonthTotal)}{" "}
                  <span className="text-sm font-normal text-gray-400">
                    / {formatCurrency(budget)}
                  </span>
                </h2>
              </div>
              <div className="text-right">
                <span
                  className={`text-xl font-bold ${
                    currentMonthTotal / budget > 1
                      ? "text-red-500"
                      : currentMonthTotal / budget > 0.8
                      ? "text-yellow-500"
                      : "text-green-500"
                  }`}
                >
                  {Math.min(
                    Number(((currentMonthTotal / budget) * 100).toFixed(0)),
                    999
                  )}
                  %
                </span>
              </div>
            </div>

            {/* Progress Bar Container */}
            <div className="h-4 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden mt-3">
              <div
                className={`h-full rounded-full transition-all duration-1000 ease-out ${
                  currentMonthTotal / budget > 1
                    ? "bg-red-500"
                    : currentMonthTotal / budget > 0.8
                    ? "bg-yellow-400"
                    : "bg-green-500"
                }`}
                style={{
                  width: `${Math.min(
                    (currentMonthTotal / budget) * 100,
                    100
                  )}%`,
                }}
              />
            </div>

            <p className="text-xs text-gray-400 mt-3 text-right">
              {currentMonthTotal > budget
                ? `Over budget by ${formatCurrency(currentMonthTotal - budget)}`
                : `${formatCurrency(budget - currentMonthTotal)} remaining`}
            </p>
          </Card>
        </motion.div>
      )}

      <motion.div variants={item}>
        {/* @ts-ignore */}
        <AiInsights insights={insights} />
      </motion.div>

      <motion.div variants={item} className="pt-2">
        {/* Monthly Trend Chart */}
        <div className="flex items-center gap-2 mb-4">
          <div className="p-1.5 bg-indigo-500/10 rounded-lg">
            <BarChart2Icon className="w-5 h-5 text-accent" />
          </div>
          <h2 className="text-xl font-bold bg-gradient-to-br from-accent to-purple-600 bg-clip-text text-transparent">
            Monthly Trend
          </h2>
        </div>
        <Card className="mt-0">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">
            Monthly Trend
          </h3>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={monthlyData}
                margin={{ top: 0, right: 0, left: -20, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke={gridColor}
                />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: textColor, fontSize: 12 }}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: textColor, fontSize: 12 }}
                />
                <Tooltip
                  content={<CustomTooltip />}
                  cursor={{ fill: cursorColor }}
                />
                <Bar dataKey="total" radius={[6, 6, 6, 6]} barSize={32}>
                  {monthlyData.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={accentColors[accentColor]?.default || "#6366f1"}
                      fillOpacity={index === monthlyData.length - 1 ? 1 : 0.3}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </motion.div>

      {/* Category Breakdown List */}
      <motion.div variants={item} className="space-y-4 pb-20">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">
          This Month's Breakdown
        </h3>
        <div className="overflow-hidden">
          {categoryData.map((cat, index) => (
            <button
              key={index}
              onClick={() => handleCategoryClick(cat.name)}
              className={`w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors ${
                index !== categoryData.length - 1
                  ? "border-b border-gray-100 dark:border-white/5"
                  : ""
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-gray-50 dark:bg-white/5 rounded-full flex items-center justify-center border border-gray-100 dark:border-white/5">
                  {getCategoryIcon(cat.name)}
                </div>
                <span className="font-medium text-gray-700 dark:text-gray-300">
                  {cat.name}
                </span>
              </div>
              <span className="font-semibold text-gray-900 dark:text-white">
                {formatCurrency(cat.value)}
              </span>
            </button>
          ))}
        </div>
        {categoryData.length === 0 && (
          <div className="text-center py-10 text-gray-400 text-sm">
            No expenses recorded yet.
          </div>
        )}
      </motion.div>

      {/* Category Expense Modal */}
      <AnimatePresence>
        {selectedCategory && (
          <ExpenseListModal
            title={selectedCategory}
            expenses={monthlyExpenses.filter(
              (e) => e.category === selectedCategory
            )}
            onClose={handleCloseModal}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default Analytics;
