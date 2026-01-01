import { useMemo, useState } from "react";
import { TrendingUp, TrendingDown, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format, subMonths } from "date-fns";
import {
  useExpenses,
  useRecentExpenses,
  useMonthlyStats,
  useExpensesForMonth,
} from "../hooks/useExpenses";
import { Timestamp } from "firebase/firestore";
import SwipeableExpenseItem from "../components/SwipeableExpenseItem";
import { getCategoryIcon } from "../utils/uiUtils";

import CountUp from "../components/CountUp";
import InsightSheet from "../components/InsightSheet";

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

const Home = () => {
  const { expenses, loading: loadingRecent } = useRecentExpenses();
  const { stats, loading: loadingStats } = useMonthlyStats();
  const { deleteExpense } = useExpenses();
  const [showInsightSheet, setShowInsightSheet] = useState(false);

  // Stabilize date references to prevent infinite hooks loops
  const now = useMemo(() => new Date(), []);
  const lastMonthDate = useMemo(() => subMonths(now, 1), [now]);

  const { expenses: lastMonthExpenses } = useExpensesForMonth(
    lastMonthDate,
    stats,
    !loadingStats
  );

  // Fetch FULL current month expenses (real-time) for the graph
  const { expenses: thisMonthFullExpenses } = useExpensesForMonth(
    now,
    stats,
    !loadingStats
  );

  // Derived State (Calculations)
  const {
    currentMonthTotal,
    percentageChange,
    trendDirection,
    lastMonthPartialSum,
    diff,
    thisMonthGraphData,
    lastMonthGraphData,
  } = useMemo(() => {
    const now = new Date();
    const currentMonthKey = format(now, "yyyy-MM");

    // @ts-ignore
    const thisMonthStat = stats.find((s) => s.monthKey === currentMonthKey);

    const thisMonthSum = thisMonthStat ? Number(thisMonthStat.total) : 0;

    // Calculate "Last Month to Same Date"
    const currentDay = now.getDate();
    const lastMonthPartialSum = lastMonthExpenses.reduce((acc, expense) => {
      const expenseDate =
        expense.date instanceof Timestamp
          ? expense.date.toDate()
          : expense.date;
      // @ts-ignore - Handle potential date type issues safely
      if (expenseDate && expenseDate.getDate() <= currentDay) {
        return acc + Number(expense.amount);
      }
      return acc;
    }, 0);

    let pctChange = 0;
    if (lastMonthPartialSum > 0) {
      pctChange =
        ((thisMonthSum - lastMonthPartialSum) / lastMonthPartialSum) * 100;
    }

    const isTrendingUp = thisMonthSum > lastMonthPartialSum;

    // --- Graph Data Prep ---
    const getCumulativeData = (
      expensesList: typeof expenses,
      daysInMonth = 31
    ) => {
      // 1. Initialize array of 0s for each day
      const dailyTotals = new Array(daysInMonth).fill(0);

      // 2. Sum up expenses per day
      expensesList.forEach((expense) => {
        // @ts-ignore
        const d =
          expense.date instanceof Timestamp
            ? expense.date.toDate()
            : expense.date;
        if (d) {
          const dayIndex = d.getDate() - 1; // 0-indexed
          if (dayIndex >= 0 && dayIndex < daysInMonth) {
            dailyTotals[dayIndex] += Number(expense.amount);
          }
        }
      });

      // 3. Convert to cumulative
      const cumulative = [];
      let runningTotal = 0;
      for (let i = 0; i < daysInMonth; i++) {
        runningTotal += dailyTotals[i];
        cumulative.push(runningTotal);
      }
      return cumulative;
    };

    // For This Month: Only go up to TODAY (don't show flat line for future)
    const currentDayIndex = now.getDate();

    // For Last Month: Use 31 days but only slice up to current day for comparison
    const fullLastMonthData = getCumulativeData(lastMonthExpenses, 31);
    const lastMonthGraphData = fullLastMonthData.slice(0, currentDayIndex);

    // We calculate full array for this month first to be safe, then slice
    const fullCurrentMonthData = getCumulativeData(thisMonthFullExpenses, 31);
    const thisMonthGraphData = fullCurrentMonthData.slice(0, currentDayIndex);

    return {
      currentMonthTotal: thisMonthSum,
      percentageChange: Math.abs(pctChange).toFixed(0),
      trendDirection: isTrendingUp ? "up" : "down",
      lastMonthPartialSum,
      lastMonthDate,
      diff: Math.abs(thisMonthSum - lastMonthPartialSum),
      thisMonthGraphData: [0, ...thisMonthGraphData],
      lastMonthGraphData: [0, ...lastMonthGraphData],
    };
  }, [stats, lastMonthExpenses, thisMonthFullExpenses]);

  if (loadingRecent || loadingStats) {
    return (
      <div className="flex justify-center items-center h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-gray-300" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in pt-4">
      {/* Hero Section */}
      <header className="flex flex-col space-y-2">
        <div className="flex justify-between items-start">
          <div>
            <span className="text-sm font-semibold text-gray-400 uppercase tracking-wide">
              {format(new Date(), "MMMM yyyy")}
            </span>
            <h1 className="text-5xl font-bold text-gray-900 dark:text-white mt-2 tracking-tight">
              <CountUp value={currentMonthTotal} />
            </h1>
          </div>
        </div>

        <div className="flex items-center space-x-2 pt-2">
          <div
            className="relative flex items-center"
            onClick={() => setShowInsightSheet(true)}
          >
            <div
              className={`cursor-pointer relative z-10 flex items-center justify-center px-2 py-1 rounded-full transition-shadow duration-300 ${
                trendDirection === "down"
                  ? "bg-green-50 dark:bg-green-500/20 text-green-700 dark:text-green-400 animate-glow-green"
                  : "bg-red-50 dark:bg-red-500/20 text-red-700 dark:text-red-400 animate-glow-red"
              }`}
            >
              {trendDirection === "down" ? (
                <TrendingDown className="w-4 h-4 mr-1" />
              ) : (
                <TrendingUp className="w-4 h-4 mr-1" />
              )}
              <span className="text-xs font-semibold">
                {percentageChange}%{" "}
                {trendDirection === "down" ? "less" : "more"} than last month
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Transaction List */}
      <section className="pb-32 md:pb-0">
        <div className="flex justify-between items-end mb-6">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">
            Recent
          </h3>
        </div>

        <div className="space-y-4">
          {expenses.length === 0 ? (
            <div className="text-center py-10 border-2 border-dashed border-gray-100 rounded-2xl">
              <p className="text-gray-400 text-sm">No expenses yet.</p>
              <p className="text-gray-300 text-xs mt-1">Tap + to add one.</p>
            </div>
          ) : (
            <motion.div
              variants={container}
              initial="hidden"
              animate="show"
              className="space-y-4"
            >
              <AnimatePresence mode="popLayout">
                {expenses.map((t) => (
                  <motion.div key={t.id} variants={item} layout>
                    <SwipeableExpenseItem
                      t={t}
                      getCategoryIcon={getCategoryIcon}
                      onDelete={deleteExpense}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </div>
      </section>

      <InsightSheet
        isOpen={showInsightSheet}
        onClose={() => setShowInsightSheet(false)}
        data={{
          currentMonthTotal,
          lastMonthPartialSum,
          diff,
          trendDirection,
          percentageChange,
          thisMonthGraphData,
          lastMonthGraphData,
        }}
        lastMonthDate={lastMonthDate}
      />
    </div>
  );
};

export default Home;
