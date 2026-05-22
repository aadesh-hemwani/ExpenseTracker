import { useMemo, useState, useEffect, lazy, Suspense, useRef, memo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  useMonthlyStats,
  useExpensesForMonth,
  useExpenses,
} from "../hooks/useExpenses";
import { getCategoryBreakdown } from "../utils/analyticsHelpers";
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
import { motion } from "framer-motion";
import { useTheme } from "../context/ThemeContext";
import CountUp from "../components/CountUp";
import { useAuth } from "../context/AuthContext";
import { db } from "../firebase";
import { doc, getDoc, Timestamp } from "firebase/firestore";
import Card from "../components/Card";
import { CATEGORY_COLORS, getCategoryIcon } from "../utils/uiUtils";

import AiInsights from "../components/AiInsights";
import { generateInsights } from "../utils/insights";
import { Expense } from "../types";
import { ChartSkeleton } from "../components/ui/Skeleton";

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 350, damping: 25 } },
};

const MonthlyTrendChart = lazy(() => import("../components/MonthlyTrendChart"));
const TrajectoryChart = lazy(() => import("../components/TrajectoryChart"));

interface AnalyticsProps {
  userId?: string;
  readOnly?: boolean;
}

const Analytics = memo(({ userId, readOnly: _readOnly = false }: AnalyticsProps) => {
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
  const textColor = "#9ca3af";

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-16 pt-[calc(env(safe-area-inset-top)+2rem)] pb-32"
    >
      {/* 1. Header welcome */}
      <motion.div variants={itemVariants} className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white bg-gradient-to-r from-gray-900 via-gray-800 to-gray-600 dark:from-white dark:via-gray-100 dark:to-gray-400 bg-clip-text text-transparent">Insights</h1>
          <p className="text-gray-400 dark:text-zinc-500 mt-1.5 font-medium text-sm">Visualize your spending patterns.</p>
        </div>
        {!_readOnly && (
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => navigate("/chat")}
            className="relative flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-violet-600/95 to-indigo-600/95 hover:from-violet-600 hover:to-indigo-600 text-white rounded-2xl transition-all duration-300 font-bold text-xs uppercase tracking-wider shadow-[0_8px_30px_rgba(99,102,241,0.2)] border border-violet-500/10 overflow-hidden group"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out" />
            <BotMessageSquare size={16} className="text-white flex-shrink-0 animate-pulse" />
            <span>Ask</span>
          </motion.button>
        )}
      </motion.div>

      {/* 2. Top Stats Grid */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 gap-4 sm:gap-6">
        <motion.div
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          transition={{ type: "spring", stiffness: 450, damping: 20 }}
          className="p-5 sm:p-6 bg-gradient-to-br from-indigo-600 to-violet-700 text-white rounded-[24px] shadow-[0_8px_32px_rgba(99,102,241,0.25)] border border-indigo-500/20 backdrop-blur-md relative overflow-hidden group cursor-pointer flex flex-col justify-between"
          onClick={() => trajectoryChartRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
        >
          <div className="absolute -right-10 -bottom-10 w-32 h-32 bg-white/5 rounded-full blur-2xl group-hover:scale-125 transition-transform duration-700 pointer-events-none" />
          
          <div className="w-full min-w-0">
            <div className="flex justify-between items-start mb-4 relative z-10 w-full min-w-0">
              <span className="text-[10px] font-extrabold text-white/70 uppercase tracking-[0.18em] whitespace-nowrap">This Month</span>
              <ArrowRight color="rgba(255,255,255,0.7)" size={14} className="-rotate-45 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform flex-shrink-0" strokeWidth={2} />
            </div>
            <div className="text-3xl sm:text-4xl font-extrabold tracking-tighter relative z-10 flex items-baseline drop-shadow-[0_2px_12px_rgba(255,255,255,0.15)] whitespace-nowrap">
              <CountUp value={trajectoryData.currentMonthTotal} />
            </div>
          </div>

          {/* Premium Savings/Spend Trend Badge */}
          <div className="mt-8 relative z-10 flex items-center">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[9px] font-extrabold uppercase tracking-wider bg-white/10 border border-white/15 text-white/95 backdrop-blur-md shadow-sm">
              {trajectoryData.trendDirection === "down" ? "↓" : "↑"}{" "}
              {trajectoryData.percentageChange}% vs last month
            </span>
          </div>
        </motion.div>

        {(() => {
          const catColor = topCategory ? (CATEGORY_COLORS[topCategory.name] || "#6366f1") : "#9ca3af";
          const pctOfTotal = topCategory && trajectoryData.currentMonthTotal > 0
            ? ((topCategory.value / trajectoryData.currentMonthTotal) * 100).toFixed(0)
            : null;

          return (
            <Card className="p-5 sm:p-6 rounded-[24px] relative overflow-hidden group cursor-pointer flex flex-col justify-between min-h-[170px] sm:min-h-[190px]">
              <div className="absolute -right-10 -bottom-10 w-32 h-32 rounded-full blur-2xl opacity-[0.04] dark:opacity-[0.07] group-hover:scale-125 transition-transform duration-700 pointer-events-none" style={{ backgroundColor: catColor }} />
              
              <div className="flex justify-between items-center mb-4 relative z-10 w-full min-w-0">
                <span className="text-[10px] font-extrabold text-gray-400 dark:text-zinc-500 uppercase tracking-[0.15em] whitespace-nowrap">Top Category</span>
                {pctOfTotal && (
                  <span 
                    className="text-[9px] font-extrabold px-2.5 py-0.5 rounded-full border whitespace-nowrap flex-shrink-0 transition-colors duration-300"
                    style={{ 
                      backgroundColor: `${catColor}12`, 
                      borderColor: `${catColor}25`,
                      color: catColor
                    }}
                  >
                    {pctOfTotal}%
                  </span>
                )}
              </div>

              {topCategory ? (
                <div className="relative z-10 flex flex-col justify-between h-full w-full min-w-0">
                  {/* Category Details Block */}
                  <div className="flex items-center gap-3 w-full min-w-0">
                    <div 
                      className="w-10 h-10 rounded-xl flex items-center justify-center border transition-all duration-300 shadow-sm"
                      style={{ 
                        backgroundColor: `${catColor}12`, 
                        borderColor: `${catColor}25` 
                      }}
                    >
                      {getCategoryIcon(topCategory.name, "20px", catColor)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-[9px] font-extrabold text-gray-400 dark:text-zinc-500 uppercase tracking-wider leading-none">
                        Category
                      </h4>
                      <p className="text-base font-bold text-gray-900 dark:text-white truncate mt-1">
                        {topCategory.name}
                      </p>
                    </div>
                  </div>

                  {/* Value Block */}
                  <div className="mt-4 sm:mt-5">
                    <h4 className="text-[9px] font-extrabold text-gray-400 dark:text-zinc-500 uppercase tracking-wider leading-none mb-1">
                      Total Outflow
                    </h4>
                    <div className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tighter">
                      {formatCurrency(topCategory.value)}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-xl font-bold text-gray-400 dark:text-zinc-500 italic relative z-10">
                  No spend data
                </div>
              )}
            </Card>
          );
        })()}
      </motion.div>

      {/* 3. Luxury Budget Gauge */}
      {budget > 0 && (
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          {(() => {
            const pct = Math.min((trajectoryData.currentMonthTotal / budget) * 100, 100);
            const isOverBudget = trajectoryData.currentMonthTotal > budget;
            const isWarningBudget = !isOverBudget && trajectoryData.currentMonthTotal / budget > 0.8;
            
            const accentColorHex = isOverBudget ? "#ef4444" : isWarningBudget ? "#f59e0b" : "#10b981";
            
            return (
              <Card className="p-6 rounded-[24px]">
                <div className="flex flex-col gap-1.5 mb-2 w-full">
                  <div className="flex justify-between items-center w-full gap-2">
                    <p className="text-[10px] font-extrabold text-gray-400 dark:text-zinc-500 uppercase tracking-[0.18em] whitespace-nowrap">Monthly Budget</p>
                    
                    {/* Status Glass Badge */}
                    <div className="flex-shrink-0">
                      <span 
                        className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border transition-colors duration-300 shadow-sm whitespace-nowrap"
                        style={{
                          backgroundColor: `${accentColorHex}12`,
                          borderColor: `${accentColorHex}25`,
                          color: accentColorHex
                        }}
                      >
                        {pct.toFixed(0)}% Utilized
                      </span>
                    </div>
                  </div>
                  
                  <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight mt-1 flex items-baseline flex-wrap gap-x-2 w-full">
                    <span className="whitespace-nowrap">{formatCurrency(trajectoryData.currentMonthTotal)}</span>
                    <span className="text-sm font-semibold text-gray-400 dark:text-zinc-500 whitespace-nowrap">/ {formatCurrency(budget)}</span>
                  </h2>
                </div>

                {/* Notched Progress Track */}
                <div className="relative w-full mt-5">
                  <div className="relative w-full h-3.5 bg-gray-100 dark:bg-white/[0.03] border border-white/10 dark:border-white/5 rounded-full overflow-hidden shadow-[inset_0_1px_3px_rgba(0,0,0,0.05)]">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 1.2, ease: "easeOut" }}
                      className="h-full rounded-full"
                      style={{
                        background: isOverBudget
                          ? "linear-gradient(to right, #ef4444, #f43f5e)" 
                          : isWarningBudget
                            ? "linear-gradient(to right, #f59e0b, #eab308)" 
                            : "linear-gradient(to right, #10b981, #06b6d4)",
                      }}
                    />
                    
                    {/* Visual notches */}
                    <div className="absolute inset-0 flex justify-between pointer-events-none px-1.5">
                      {Array.from({ length: 16 }).map((_, i) => (
                        <div 
                          key={i} 
                          className="w-[1.5px] h-full bg-white dark:bg-black/35 opacity-25" 
                        />
                      ))}
                    </div>
                  </div>

                  {/* Concentric Glowing Cursor indicator */}
                  {pct > 0 && pct < 100 && (
                    <motion.div
                      initial={{ left: 0 }}
                      animate={{ left: `${pct}%` }}
                      transition={{ duration: 1.2, ease: "easeOut" }}
                      className="absolute top-[2px] -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-white shadow-md border-2"
                      style={{ borderColor: accentColorHex }}
                    >
                      <motion.div
                        animate={{ scale: [1, 1.8, 1], opacity: [0.6, 0.1, 0.6] }}
                        transition={{ duration: 1.8, repeat: Infinity }}
                        className="absolute -inset-1.5 rounded-full opacity-30 pointer-events-none"
                        style={{ backgroundColor: accentColorHex }}
                      />
                    </motion.div>
                  )}
                </div>

                <div className="flex justify-end items-center mt-4">
                  <p className="text-xs font-extrabold tracking-wider uppercase whitespace-nowrap" style={{ color: accentColorHex }}>
                    {trajectoryData.currentMonthTotal > budget
                      ? `Over budget by ${formatCurrency(trajectoryData.currentMonthTotal - budget)}`
                      : `${formatCurrency(budget - trajectoryData.currentMonthTotal)} remaining`}
                  </p>
                </div>
              </Card>
            );
          })()}
        </motion.div>
      )}

      {/* 4. AI Insights Panel */}
      <motion.div variants={itemVariants}>
        <AiInsights insights={insights} isLoading={aiLoading} />
      </motion.div>

      {/* 5. Category Breakdown Component */}
      <motion.div variants={itemVariants} className="pt-8">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-1.5 bg-violet-500/10 rounded-lg">
            <PieChart color="var(--color-accent)" size={20} className="text-accent" />
          </div>
          <h2 className="text-xl font-bold bg-gradient-to-br from-accent to-accent/60 bg-clip-text text-transparent">Category Allocation</h2>
        </div>

        <Card className="p-6 rounded-[24px]">
          <h3 className="text-sm font-extrabold text-gray-400 dark:text-zinc-500 uppercase tracking-[0.18em] mb-6">Distribution share</h3>

          {categoryBreakdown.length > 0 ? (
            <div className="flex flex-col gap-6">
              {categoryBreakdown.map((cat, index) => {
                const catColor = CATEGORY_COLORS[cat.name] || "#6366f1";
                const pct = trajectoryData.currentMonthTotal > 0
                  ? (cat.value / trajectoryData.currentMonthTotal) * 100
                  : 0;

                return (
                  <motion.div
                    key={cat.name}
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4, delay: index * 0.05 }}
                    viewport={{ once: true }}
                    className="flex flex-col gap-2 group cursor-pointer"
                  >
                    <div className="flex justify-between items-center w-full">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-10 h-10 rounded-xl flex items-center justify-center border transition-all duration-300"
                          style={{ 
                            backgroundColor: `${catColor}12`, 
                            borderColor: `${catColor}25` 
                          }}
                        >
                          {getCategoryIcon(cat.name, "20px", catColor)}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-900 dark:text-white transition-colors group-hover:text-accent">
                            {cat.name}
                          </p>
                          <p className="text-[10px] text-gray-400 dark:text-zinc-500 font-bold uppercase tracking-wider">
                            {pct.toFixed(0)}% of outflow
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-extrabold text-gray-900 dark:text-white">
                          {formatCurrency(cat.value)}
                        </p>
                      </div>
                    </div>

                    {/* Custom Branded Progress Bar */}
                    <div className="relative w-full h-1.5 bg-gray-100 dark:bg-white/[0.02] border border-white/5 rounded-full overflow-hidden mt-1">
                      <motion.div
                        initial={{ width: 0 }}
                        whileInView={{ width: `${pct}%` }}
                        transition={{ duration: 0.8, ease: "easeOut", delay: 0.1 }}
                        viewport={{ once: true }}
                        className="h-full rounded-full"
                        style={{ 
                          backgroundColor: catColor,
                          boxShadow: `0 0 8px ${catColor}35` 
                        }}
                      />
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400 dark:text-zinc-500 italic">
              No expenses recorded for this period
            </div>
          )}
        </Card>
      </motion.div>

      {/* 6. Spend Trajectory Area Chart */}
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
                <span className={`font-extrabold ${trajectoryData.trendDirection === "down" ? "text-emerald-500" : "text-rose-500"}`}>{formatCurrency(trajectoryData.diff)}</span>{" "}
                <span className="font-medium text-gray-600 dark:text-zinc-400">{trajectoryData.trendDirection === "down" ? "lower" : "higher"} than last month</span>
              </div>
              <p className="text-xs text-gray-500 leading-tight">By {format(lastMonthDate, "MMMM do")}, you had spent <span className="font-semibold text-gray-600 dark:text-gray-400">{formatCurrency(trajectoryData.lastMonthPartialSum)}</span></p>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* 7. Monthly Trend Bar Chart */}
      <motion.div variants={itemVariants} className="pt-8">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-1.5 bg-indigo-500/10 rounded-lg">
            <BarChart3 color="var(--color-accent)" size={20} className="text-accent" />
          </div>
          <h2 className="text-xl font-bold bg-gradient-to-br from-accent to-accent/60 bg-clip-text text-transparent">Monthly Outflow</h2>
        </div>
        {chartInsight && <p className="text-xs text-gray-500 dark:text-zinc-500 mt-[-14px] mb-4 ml-9 font-bold tracking-wide uppercase">{chartInsight}</p>}
        <Card className="mt-0 pt-8 pb-4">
          <h3 className="text-sm font-extrabold text-gray-400 dark:text-zinc-500 uppercase tracking-[0.18em] mb-6 px-2">Outflow Trend</h3>
          <div className="h-64 w-full">
            <Suspense fallback={<ChartSkeleton />}>
              <MonthlyTrendChart
                data={monthlyTrendData}
                gridColor={gridColor}
                textColor={textColor}
                accentColor={accentColor}
                accentColors={accentColors}
              />
            </Suspense>
          </div>
        </Card>
      </motion.div>

    </motion.div>
  );
});

Analytics.displayName = "Analytics";

export default Analytics;