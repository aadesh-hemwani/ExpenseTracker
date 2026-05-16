import React, { useMemo, useState, useEffect, useCallback, lazy, Suspense, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
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
  Lightbulb,
  BotMessageSquare
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
import { Expense } from "../types";
import { ChartSkeleton } from "../components/ui/Skeleton";

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

const MonthlyTrendChart = lazy(() => import("../components/MonthlyTrendChart"));
const TrajectoryChart = lazy(() => import("../components/TrajectoryChart"));

interface AnalyticsProps {
  userId?: string;
  readOnly?: boolean;
}

const Analytics = React.memo(({ userId, readOnly: _readOnly = false }: AnalyticsProps) => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const trajectoryChartRef = useRef<HTMLDivElement>(null);

  const { stats, loading: statsLoading } = useMonthlyStats(userId);

  const targetDate = useMemo(() => new Date(), []);
  const { expenses: monthlyExpenses, loading: monthlyLoading } = useExpensesForMonth(
    targetDate,
    stats,
    !statsLoading,
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
  }, [user, userId]);

  // AUTO-SYNC STATS Logic
  const { updateMonthlyStat } = useExpenses();
  useEffect(() => {
    if (monthlyLoading || statsLoading || userId) return;

    const currentMonthKey = format(targetDate, "yyyy-MM");
    const cachedStat = stats.find((s) => s.monthKey === currentMonthKey);

    const trueTotal = monthlyExpenses.reduce((sum, item) => sum + Number(item.amount), 0);
    const trueCount = monthlyExpenses.length;

    if (trueCount === 0 && cachedStat && cachedStat.count > 0) {
      console.warn("Auto-Sync Aborted: Mismatch detected (Fetch likely failed). Stats:", cachedStat);
      return;
    }

    if (trueCount === 0 && (!cachedStat || cachedStat.count === 0)) {
      return;
    }

    if (!cachedStat || cachedStat.total !== trueTotal || cachedStat.count !== trueCount) {
      updateMonthlyStat(currentMonthKey, trueTotal, trueCount, userId);
    }
  }, [monthlyExpenses, stats, monthlyLoading, statsLoading, targetDate, updateMonthlyStat, userId]);

  const monthlyTrendData = useMemo(() => {
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

  const chartInsight = useMemo(() => {
    if (monthlyTrendData.length < 2) return null;
    const sorted = [...monthlyTrendData].filter(d => d.total > 0).sort((a, b) => b.total - a.total);
    if (sorted.length === 0) return "No spending data for this period";

    const max = sorted[0];
    const latest = monthlyTrendData[monthlyTrendData.length - 1];

    if (latest.total === 0) return `Peak spending was ${formatCurrency(max.total)} in ${max.name}`;

    if (latest.key === max.key) {
      return `Highest spending reached this month: ${formatCurrency(latest.total)}`;
    } else {
      const diffPct = ((max.total - latest.total) / max.total) * 100;
      return `Spending ${diffPct > 0 ? "↓" : "↑"}${Math.abs(diffPct).toFixed(0)}% from ${max.name} peak`;
    }
  }, [monthlyTrendData]);

  const categoryBreakdown = useMemo(() => getCategoryBreakdown(monthlyExpenses), [monthlyExpenses]);

  const lastMonthDate = useMemo(() => subMonths(targetDate, 1), [targetDate]);
  const { expenses: lastMonthExpenses } = useExpensesForMonth(
    lastMonthDate,
    stats,
    !statsLoading,
    false,
    userId
  );

  const trajectoryData = useMemo(() => {
    const currentDay = targetDate.getDate();
    const daysInMonth = 31;

    const thisSum = monthlyExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
    const lastPartialSum = lastMonthExpenses.reduce((acc, e) => {
      const d = e.date instanceof Timestamp ? e.date.toDate() : new Date(e.date);
      if (d && d.getDate() <= currentDay) return acc + Number(e.amount);
      return acc;
    }, 0);

    let pctChange = 0;
    if (lastPartialSum > 0) {
      pctChange = ((thisSum - lastPartialSum) / lastPartialSum) * 100;
    }

    const getDailyCumulative = (list: Expense[]) => {
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
      trendDirection: (thisSum > lastPartialSum ? "up" : "down") as "up" | "down",
      thisMonthGraphData: [0, ...thisGraph],
      lastMonthGraphData: [0, ...lastGraph],
      diff: Math.abs(thisSum - lastPartialSum),
      lastMonthPartialSum: lastPartialSum,
      currentMonthTotal: thisSum,
    };
  }, [monthlyExpenses, lastMonthExpenses, targetDate]);

  const { analyticsInsights, loading: aiLoading, fetchAnalyticsInsights } = useAiInsights();

  useEffect(() => {
    if (!monthlyLoading && !statsLoading && monthlyExpenses.length > 0) {
      fetchAnalyticsInsights(monthlyExpenses, budget, trajectoryData.currentMonthTotal);
    }
  }, [monthlyLoading, statsLoading, monthlyExpenses, budget, fetchAnalyticsInsights, trajectoryData.currentMonthTotal]);

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

    return generateInsights(
      stats as any,
      monthlyExpenses,
      trajectoryData.currentMonthTotal,
      budget,
    );
  }, [stats, monthlyExpenses, trajectoryData.currentMonthTotal, budget, analyticsInsights]);

  const topCategory = categoryBreakdown[0];

  useEffect(() => {
    if (location.state?.scrollToTrajectory && trajectoryChartRef.current) {
      const timer = setTimeout(() => {
        trajectoryChartRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [location.state]);

  const gridColor = theme === "dark" ? "#374151" : "#f3f4f6";
  const cursorColor = theme === "dark" ? "#1f2937" : "#f9fafb";
  const textColor = "#9ca3af";

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-16 pt-[calc(env(safe-area-inset-top)+2rem)] pb-32"
    >
      <motion.div variants={itemVariants} className="flex justify-between items-start">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white">Insights</h1>
          <p className="text-gray-500 mt-2">Visualize your spending patterns.</p>
        </div>
        {!_readOnly && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate("/chat")}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-900 dark:text-white rounded-2xl transition-colors shadow-sm font-semibold text-sm"
          >
            <BotMessageSquare size={18} className="text-accent" />
            <span>Ask AI</span>
          </motion.button>
        )}
      </motion.div>

      <motion.div variants={itemVariants} className="grid grid-cols-2 gap-6">
        <motion.div
          whileTap={{ scale: 0.98 }}
          transition={{ type: "spring", stiffness: 400, damping: 17 }}
          className="p-5 bg-gradient-to-br from-accent to-indigo-600 dark:from-accent dark:to-indigo-500 text-white rounded-[20px] shadow-sm backdrop-blur-md"
        >
          <div className="flex justify-between items-start mb-4">
            <span className="text-[9px] font-bold text-white/90 uppercase tracking-[0.15em]">This Month</span>
            <ArrowRight color="rgba(255,255,255,0.6)" size={14} className="-rotate-45" strokeWidth={1.5} />
          </div>
          <div className="text-4xl font-bold">
            <CountUp value={trajectoryData.currentMonthTotal} />
          </div>
        </motion.div>

        <Card className="p-5">
          <div className="flex justify-between items-start mb-4">
            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-[0.15em]">Top Category</span>
            <PieChart color="var(--color-accent)" size={16} className="text-accent" />
          </div>
          <div className="text-xl font-bold text-gray-900 dark:text-white truncate">
            {topCategory ? topCategory.name : "—"}
          </div>
          <div className="text-sm text-gray-500 mt-1">
            {topCategory ? formatCurrency(topCategory.value) : "No data"}
          </div>
        </Card>
      </motion.div>

      {budget > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <Card className="p-6">
            <div className="flex justify-between items-end mb-2">
              <div>
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-[0.15em]">Monthly Budget</p>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {formatCurrency(trajectoryData.currentMonthTotal)}{" "}
                  <span className="text-sm font-normal text-gray-400">/ {formatCurrency(budget)}</span>
                </h2>
              </div>
              <div className="text-right">
                <span className={`text-xl font-bold ${trajectoryData.currentMonthTotal / budget > 1 ? "text-red-500" : trajectoryData.currentMonthTotal / budget > 0.8 ? "text-yellow-500" : "text-green-500"}`}>
                  {Math.min(Number(((trajectoryData.currentMonthTotal / budget) * 100).toFixed(0)), 999)}%
                </span>
              </div>
            </div>
            <div className="h-4 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden mt-3">
              <div
                className={`h-full rounded-full transition-all duration-1000 ease-out ${trajectoryData.currentMonthTotal / budget > 1 ? "bg-red-500" : trajectoryData.currentMonthTotal / budget > 0.8 ? "bg-yellow-400" : "bg-green-500"}`}
                style={{ width: `${Math.min((trajectoryData.currentMonthTotal / budget) * 100, 100)}%` }}
              />
            </div>
            <p className="text-xs text-gray-400 mt-3 text-right">
              {trajectoryData.currentMonthTotal > budget
                ? `Over budget by ${formatCurrency(trajectoryData.currentMonthTotal - budget)}`
                : `${formatCurrency(budget - trajectoryData.currentMonthTotal)} remaining`}
            </p>
          </Card>
        </motion.div>
      )}

      <motion.div variants={itemVariants}>
        <AiInsights insights={insights} isLoading={aiLoading} />
      </motion.div>

      <motion.div variants={itemVariants} className="pt-8" ref={trajectoryChartRef}>
        <div className="flex items-center gap-2 mb-4">
          <div className="p-1.5 bg-accent/10 rounded-lg">
            {trajectoryData.trendDirection === "up" ? (
              <TrendingUp color="var(--color-accent)" size={20} className="text-accent" />
            ) : (
              <TrendingDown color="var(--color-accent)" size={20} className="text-accent" />
            )}
          </div>
          <h2 className="text-xl font-bold bg-gradient-to-br from-accent to-accent/60 bg-clip-text text-transparent">Current Spend Trajectory</h2>
        </div>
        <Card className="mt-0 pt-8 pb-4">
          <div className="h-48 w-full px-2">
            <Suspense fallback={<ChartSkeleton />}>
              <TrajectoryChart
                currentMonthData={trajectoryData.thisMonthGraphData || []}
                lastMonthData={trajectoryData.lastMonthGraphData || []}
                trendDirection={trajectoryData.trendDirection}
              />
            </Suspense>
          </div>
          <div className="mt-8 flex justify-between items-start w-full px-2">
            <div className="flex-1 pr-4">
              <div className="text-sm text-gray-700 dark:text-gray-300 leading-snug mb-0.5">
                <span className={`font-bold ${trajectoryData.trendDirection === "down" ? "text-emerald-500" : "text-rose-500"}`}>{formatCurrency(trajectoryData.diff)}</span>{" "}
                {trajectoryData.trendDirection === "down" ? "lower" : "higher"} than last month
              </div>
              <p className="text-xs text-gray-500 leading-tight">By {format(lastMonthDate, "MMMM do")}, you had spent <span className="font-medium text-gray-500 dark:text-gray-400">{formatCurrency(trajectoryData.lastMonthPartialSum)}</span></p>
            </div>
          </div>
        </Card>
      </motion.div>

      <motion.div variants={itemVariants} className="pt-8">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-1.5 bg-indigo-500/10 rounded-lg">
            <BarChart3 color="var(--color-accent)" size={20} className="text-accent" />
          </div>
          <h2 className="text-xl font-bold bg-gradient-to-br from-accent to-accent/60 bg-clip-text text-transparent">Monthly Trend</h2>
        </div>
        {chartInsight && <p className="text-xs text-gray-500 dark:text-gray-400 mt-[-14px] mb-4 ml-9 font-medium">{chartInsight}</p>}
        <Card className="mt-0">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Monthly Trend</h3>
          <div className="h-64 w-full">
            <Suspense fallback={<ChartSkeleton />}>
              <MonthlyTrendChart
                data={monthlyTrendData}
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

      <motion.div variants={itemVariants} className="space-y-4 pb-20">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">This Month's Breakdown</h3>
        <div className="overflow-hidden">
          {categoryBreakdown.map((cat, index) => (
            <button
              key={index}
              onClick={() => handleCategoryClick(cat.name)}
              className={`w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors ${index !== categoryBreakdown.length - 1 ? "border-b border-gray-100 dark:border-white/5" : ""}`}
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 flex items-center justify-center scale-125">{getCategoryIcon(cat.name, "25px")}</div>
                <span className="font-medium text-gray-700 dark:text-gray-300">{cat.name}</span>
              </div>
              <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(cat.value)}</span>
            </button>
          ))}
        </div>
        {categoryBreakdown.length === 0 && <div className="text-center py-10 text-gray-400 text-sm">No expenses recorded yet.</div>}
      </motion.div>

      <AnimatePresence>
        {selectedCategory && (
          <ExpenseListModal
            title={selectedCategory}
            expenses={monthlyExpenses.filter((e) => e.category === selectedCategory)}
            onClose={handleCloseModal}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
});

Analytics.displayName = "Analytics";

export default Analytics;