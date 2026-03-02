import { useMemo, useState, useEffect, useCallback, lazy, Suspense, useRef } from "react";
import { useLocation } from "react-router-dom";
import {
  useMonthlyStats,
  useExpensesForMonth,
  useExpenses,
} from "../hooks/useExpenses";
import { getCategoryBreakdown } from "../utils/analyticsHelpers";
import { getCategoryIcon } from "../utils/uiUtils";
import { formatCurrency } from "../utils/formatUtils";
import { format, subMonths } from "date-fns";
import {
  ArrowRight,
  PieChart,
  BarChart3,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  Lightbulb
} from "lucide-react";
import { useAiInsights } from "../hooks/useAiInsights";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "../context/ThemeContext";
import CountUp from "../components/CountUp";
import { useAuth } from "../context/AuthContext";
import { db } from "../firebase";
import { doc, getDoc, Timestamp } from "firebase/firestore";
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

const MonthlyTrendChart = lazy(() => import("../components/MonthlyTrendChart"));
const TrajectoryChart = lazy(() => import("../components/TrajectoryChart"));

interface AnalyticsProps {
  userId?: string;
  readOnly?: boolean;
}

const Analytics = ({ userId, readOnly: _readOnly = false }: AnalyticsProps) => {
  const { user } = useAuth();
  const location = useLocation();
  const trajectoryChartRef = useRef<HTMLDivElement>(null);

  // 1. Get High-Level Stats for Trend Chart
  const { stats, loading: statsLoading } = useMonthlyStats(userId);

  // 2. Get Detailed Expenses for Current Month (for Category Breakdown)
  // We default to the current month for the "Insight" view
  // We default to the current month for the "Insight" view
  const [targetDate] = useState<Date>(new Date());
  const { expenses: monthlyExpenses, loading } = useExpensesForMonth(
    targetDate,
    stats,
    !statsLoading, // Wait for stats to load!
    false,
    userId,
  );

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const handleCategoryClick = useCallback((category: string) => {
    setSelectedCategory(category);
  }, []);

  const handleCloseModal = useCallback(() => {
    setSelectedCategory(null);
  }, []);

  const { theme, accentColor, accentColors } = useTheme();
  const [budget, setBudget] = useState(0);

  useEffect(() => {
    const fetchBudget = async () => {
      const targetUid = userId || user?.uid;
      if (targetUid) {
        const userRef = doc(db, "users", targetUid);
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
    // Wait for BOTH detailed expenses AND stats to be fully loaded
    if (loading || statsLoading || userId) return;

    const currentMonthKey = format(targetDate, "yyyy-MM");

    // Find cached stat
    const cachedStat = stats.find((s: any) => s.monthKey === currentMonthKey);

    // Calculate true totals from actual expenses
    const trueTotal = monthlyExpenses.reduce(
      (sum, item) => sum + Number(item.amount),
      0,
    );
    const trueCount = monthlyExpenses.length;

    // SAFETY GUARD 1: If we found NO expenses, but stats claim we have them,
    // it's likely a fetch failure. Do NOT overwrite with 0.
    if (trueCount === 0 && cachedStat && cachedStat.count > 0) {
      console.warn(
        "Auto-Sync Aborted: Mismatch detected (Fetch likely failed). Stats:",
        cachedStat,
      );
      return;
    }

    // SAFETY GUARD 2: If both are empty/zero, no need to write a "0" doc.
    // This prevents creating ghost docs if stats failed to load.
    if (trueCount === 0 && (!cachedStat || cachedStat.count === 0)) {
      return;
    }

    // Compare and Update if needed
    if (
      !cachedStat ||
      cachedStat.total !== trueTotal ||
      cachedStat.count !== trueCount
    ) {
      console.log(`Auto-Syncing Stats for ${currentMonthKey}...`);
      console.log(`Cached: ${cachedStat?.total}, True: ${trueTotal}`);
      updateMonthlyStat(currentMonthKey, trueTotal, trueCount, userId);
    }
  }, [
    monthlyExpenses,
    stats,
    loading,
    statsLoading,
    targetDate,
    updateMonthlyStat,
  ]);

  // A. Prepare Data for "Monthly Trend" (Last 6 Months) from 'stats'
  const monthlyData = useMemo(() => {
    const last6 = [];
    const today = new Date();
    for (let i = 5; i >= 0; i--) {
      const date = subMonths(today, i);
      const key = format(date, "yyyy-MM");
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
    [monthlyExpenses],
  );

  // C. Calculate Trajectory Chart Data
  const lastMonthDate = useMemo(() => subMonths(targetDate, 1), [targetDate]);
  const { expenses: lastMonthExpenses } = useExpensesForMonth(
    lastMonthDate,
    stats,
    !statsLoading,
    false,
    userId
  );

  const {
    thisMonthGraphData,
    lastMonthGraphData,
    trendDirection,
    percentageChange,
    diff,
    lastMonthPartialSum
  } = useMemo(() => {
    const currentDay = targetDate.getDate();
    const daysInMonth = 31;

    // 1. Current Month Total
    const thisSum = monthlyExpenses.reduce((sum, e) => sum + Number(e.amount), 0);

    // 2. Last Month Partial (Compare up to same day)
    const lastPartialSum = lastMonthExpenses.reduce((acc, e) => {
      const d = e.date instanceof Timestamp ? e.date.toDate() : new Date(e.date);
      if (d && d.getDate() <= currentDay) return acc + Number(e.amount);
      return acc;
    }, 0);

    // 3. Trends
    let pctChange = 0;
    if (lastPartialSum > 0) {
      pctChange = ((thisSum - lastPartialSum) / lastPartialSum) * 100;
    }
    const isTrendingUp = thisSum > lastPartialSum;

    // 4. Graph Data Helpers
    const getDailyCumulative = (list: any[]) => {
      const totals = new Array(daysInMonth).fill(0);
      list.forEach((e) => {
        const d = e.date instanceof Timestamp ? e.date.toDate() : new Date(e.date);
        if (d) {
          const day = d.getDate() - 1;
          if (day >= 0 && day < daysInMonth) totals[day] += Number(e.amount);
        }
      });
      const cumulative: number[] = [];
      let sum = 0;
      totals.forEach((val) => {
        sum += val;
        cumulative.push(sum);
      });
      return cumulative;
    };

    const thisGraph = getDailyCumulative(monthlyExpenses).slice(0, currentDay);
    const lastGraph = getDailyCumulative(lastMonthExpenses).slice(0, currentDay);

    return {
      percentageChange: Math.abs(pctChange).toFixed(0),
      trendDirection: (isTrendingUp ? "up" : "down") as "up" | "down",
      thisMonthGraphData: [0, ...thisGraph],
      lastMonthGraphData: [0, ...lastGraph],
      diff: Math.abs(thisSum - lastPartialSum),
      lastMonthPartialSum: lastPartialSum,
    };
  }, [monthlyExpenses, lastMonthExpenses, targetDate]);

  // Current Month KPI (Calculated from detailed expenses for accuracy/liveliness)
  const currentMonthTotal = useMemo(() => {
    return monthlyExpenses.reduce((sum, item) => sum + Number(item.amount), 0);
  }, [monthlyExpenses]);

  // Generate AI Insights
  const {
    analyticsInsights,
    loading: aiLoading,
    fetchAnalyticsInsights,
  } = useAiInsights();

  useEffect(() => {
    if (!loading && !statsLoading && monthlyExpenses.length > 0) {
      const total = monthlyExpenses.reduce(
        (sum, item) => sum + Number(item.amount),
        0,
      );
      fetchAnalyticsInsights(monthlyExpenses, budget, total);
    }
  }, [loading, statsLoading, monthlyExpenses, budget, fetchAnalyticsInsights]);

  const insights = useMemo(() => {
    if (analyticsInsights.length > 0) {
      return analyticsInsights.map((ai, index) => {
        let icon = Lightbulb;
        let color = "text-indigo-600 dark:text-indigo-400";
        let bg = "bg-indigo-50 dark:bg-indigo-500/10";

        if (ai.type === "warning") {
          icon = AlertTriangle;
          color = "text-red-600 dark:text-red-400";
          bg = "bg-red-50 dark:bg-red-500/10";
        } else if (ai.type === "trendingUp") {
          icon = TrendingUp;
          color = "text-amber-600 dark:text-amber-400";
          bg = "bg-amber-50 dark:bg-amber-500/10";
        } else if (ai.type === "trendingDown") {
          icon = TrendingDown;
          color = "text-emerald-600 dark:text-emerald-400";
          bg = "bg-emerald-50 dark:bg-emerald-500/10";
        } else if (ai.type === "success") {
          icon = CheckCircle2;
          color = "text-green-600 dark:text-green-400";
          bg = "bg-green-50 dark:bg-green-500/10";
        } else if (ai.type === "category") {
          icon = PieChart;
          color = "text-purple-600 dark:text-purple-400";
          bg = "bg-purple-50 dark:bg-purple-500/10";
        }

        return {
          id: `ai-${index}`,
          priority: ai.priority || index,
          icon,
          title: ai.title,
          text: ai.message,
          color,
          bg,
        };
      });
    }

    // Fallback to local insights if AI is loading or fails
    return generateInsights(
      stats as any,
      monthlyExpenses,
      currentMonthTotal,
      budget,
    );
  }, [stats, monthlyExpenses, currentMonthTotal, budget, analyticsInsights]);

  const topCategory = categoryData[0];

  // Auto-scroll to Trajectory Chart if coming from Home's trend pill
  useEffect(() => {
    if (location.state?.scrollToTrajectory && trajectoryChartRef.current) {
      setTimeout(() => {
        trajectoryChartRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 300); // Small delay to let the page render
    }
  }, [location.state]);

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
          className="p-5 bg-gradient-to-br from-accent to-indigo-600 dark:from-accent dark:to-indigo-500 text-white rounded-3xl shadow-sm backdrop-blur-md"
        >
          <div className="flex justify-between items-start mb-4">
            <span className="text-xs font-medium text-white/90 uppercase tracking-wider">
              This Month
            </span>
            <ArrowRight
              color="rgba(255,255,255,0.6)"
              size={14}
              className="-rotate-45"
              strokeWidth={1.5}
            />
          </div>
          <div className="text-4xl font-bold">
            <CountUp value={currentMonthTotal} />
          </div>
        </motion.div>

        <Card className="p-5">
          <div className="flex justify-between items-start mb-4">
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
              Top Category
            </span>
            <PieChart
              color="var(--color-accent)"
              size={16}
              className="text-accent"
            />
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
                  className={`text-xl font-bold ${currentMonthTotal / budget > 1
                    ? "text-red-500"
                    : currentMonthTotal / budget > 0.8
                      ? "text-yellow-500"
                      : "text-green-500"
                    }`}
                >
                  {Math.min(
                    Number(((currentMonthTotal / budget) * 100).toFixed(0)),
                    999,
                  )}
                  %
                </span>
              </div>
            </div>

            {/* Progress Bar Container */}
            <div className="h-4 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden mt-3">
              <div
                className={`h-full rounded-full transition-all duration-1000 ease-out ${currentMonthTotal / budget > 1
                  ? "bg-red-500"
                  : currentMonthTotal / budget > 0.8
                    ? "bg-yellow-400"
                    : "bg-green-500"
                  }`}
                style={{
                  width: `${Math.min(
                    (currentMonthTotal / budget) * 100,
                    100,
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
        <AiInsights insights={insights} isLoading={aiLoading} />
      </motion.div>

      {/* Trajectory Chart from Home Hero Card */}
      <motion.div variants={item} className="pt-2" ref={trajectoryChartRef}>
        <div className="flex items-center gap-2 mb-4">
          <div className="p-1.5 bg-accent/10 rounded-lg">
            {trendDirection === "up" ? (
              <TrendingUp color="var(--color-accent)" size={20} className="text-accent" />
            ) : (
              <TrendingDown color="var(--color-accent)" size={20} className="text-accent" />
            )}
          </div>
          <h2 className="text-xl font-bold bg-gradient-to-br from-accent to-accent/60 bg-clip-text text-transparent">
            Current Spend Trajectory
          </h2>
        </div>
        <Card className="mt-0 pt-8 pb-4">
          <div className="h-48 w-full px-2">
            <Suspense fallback={<div className="w-full h-full flex items-center justify-center"><div className="animate-pulse w-full h-full bg-gray-100 dark:bg-gray-800 rounded-xl" /></div>}>
              <TrajectoryChart
                currentMonthData={thisMonthGraphData || []}
                lastMonthData={lastMonthGraphData || []}
                trendDirection={trendDirection}
              />
            </Suspense>
          </div>

          <div className="mt-8 flex justify-between items-start w-full px-2">
            <div className="flex-1 pr-4">
              <div className="text-sm text-gray-700 dark:text-gray-300 leading-snug mb-0.5">
                <span
                  className={`font-bold ${trendDirection === "down" ? "text-emerald-500" : "text-rose-500"}`}
                >
                  {formatCurrency(diff)}
                </span>{" "}
                {trendDirection === "down" ? "lower" : "higher"} than last month
              </div>
              <p className="text-xs text-gray-500 leading-tight">
                By {format(lastMonthDate, "MMMM do")}, you had spent{" "}
                <span className="font-medium text-gray-500 dark:text-gray-400">
                  {formatCurrency(lastMonthPartialSum)}
                </span>
              </p>
            </div>
          </div>
        </Card>
      </motion.div>

      <motion.div variants={item} className="pt-2">
        {/* Monthly Trend Chart */}
        <div className="flex items-center gap-2 mb-4">
          <div className="p-1.5 bg-indigo-500/10 rounded-lg">
            <BarChart3
              color="var(--color-accent)"
              size={20}
              className="text-accent"
            />
          </div>
          <h2 className="text-xl font-bold bg-gradient-to-br from-accent to-accent/60 bg-clip-text text-transparent">
            Monthly Trend
          </h2>
        </div>
        <Card className="mt-0">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">
            Monthly Trend
          </h3>

          <div className="h-64 w-full">
            <Suspense fallback={<div className="w-full h-full flex items-center justify-center"><div className="animate-pulse w-full h-full bg-gray-100 dark:bg-gray-800 rounded-xl" /></div>}>
              <MonthlyTrendChart
                data={monthlyData}
                gridColor={gridColor}
                textColor={textColor}
                cursorColor={cursorColor}
                accentColor={accentColor}
                accentColors={accentColors}
              />
            </Suspense>
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
              className={`w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors ${index !== categoryData.length - 1
                ? "border-b border-gray-100 dark:border-white/5"
                : ""
                }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 flex items-center justify-center scale-125">
                  {getCategoryIcon(cat.name, "25px")}
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
              (e) => e.category === selectedCategory,
            )}
            onClose={handleCloseModal}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default Analytics;
