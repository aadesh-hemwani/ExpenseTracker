import { useMemo, useState } from "react";
import {
  TrendingUpOutline,
  TrendingDownOutline,
  RefreshCircleOutline,
  ArrowForwardOutline,
} from "react-ionicons";
import { motion, AnimatePresence } from "framer-motion";
import { format, subMonths } from "date-fns";
import {
  useExpenses,
  useMonthlyStats,
  useExpensesForMonth,
} from "../hooks/useExpenses";
import { Timestamp } from "firebase/firestore";
import { Expense } from "../types";
import SwipeableExpenseItem from "../components/SwipeableExpenseItem";
import { getCategoryIcon } from "../utils/uiUtils";

import CountUp from "../components/CountUp";
import InsightSheet from "../components/InsightSheet";

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
};

const item = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0 },
};

const Home = () => {
  const { stats, loading: loadingStats } = useMonthlyStats();
  const { deleteExpense } = useExpenses();
  const [showInsightSheet, setShowInsightSheet] = useState(false);

  const now = useMemo(() => new Date(), []);
  const lastMonthDate = useMemo(() => subMonths(now, 1), [now]);

  const { expenses: lastMonthExpenses } = useExpensesForMonth(
    lastMonthDate,
    stats,
    !loadingStats
  );

  const { expenses: thisMonthFullExpenses, loading: loadingCurrent } =
    useExpensesForMonth(now, stats, !loadingStats);

  const recentExpenses = useMemo(() => {
    const all = [...thisMonthFullExpenses, ...lastMonthExpenses];
    return all
      .sort((a, b) => {
        // @ts-ignore
        const dateA = a.date instanceof Timestamp ? a.date.toDate() : a.date;
        // @ts-ignore
        const dateB = b.date instanceof Timestamp ? b.date.toDate() : b.date;
        return Number(dateB) - Number(dateA);
      })
      .slice(0, 20);
  }, [thisMonthFullExpenses, lastMonthExpenses]);

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

    const currentDay = now.getDate();
    const lastMonthPartialSum = lastMonthExpenses.reduce((acc, expense) => {
      const expenseDate =
        expense.date instanceof Timestamp
          ? expense.date.toDate()
          : expense.date;
      // @ts-ignore
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

    const getCumulativeData = (expensesList: Expense[], daysInMonth = 31) => {
      const dailyTotals = new Array(daysInMonth).fill(0);
      expensesList.forEach((expense) => {
        // @ts-ignore
        const d =
          expense.date instanceof Timestamp
            ? expense.date.toDate()
            : expense.date;
        if (d) {
          const dayIndex = d.getDate() - 1;
          if (dayIndex >= 0 && dayIndex < daysInMonth) {
            dailyTotals[dayIndex] += Number(expense.amount);
          }
        }
      });

      const cumulative = [];
      let runningTotal = 0;
      for (let i = 0; i < daysInMonth; i++) {
        runningTotal += dailyTotals[i];
        cumulative.push(runningTotal);
      }
      return cumulative;
    };

    const currentDayIndex = now.getDate();
    const fullLastMonthData = getCumulativeData(lastMonthExpenses, 31);
    const lastMonthGraphData = fullLastMonthData.slice(0, currentDayIndex);

    const fullCurrentMonthData = getCumulativeData(thisMonthFullExpenses, 31);
    const thisMonthGraphData = fullCurrentMonthData.slice(0, currentDayIndex);

    return {
      currentMonthTotal: thisMonthSum,
      percentageChange: Math.abs(pctChange).toFixed(0),
      trendDirection: (isTrendingUp ? "up" : "down") as "up" | "down",
      lastMonthPartialSum,
      lastMonthDate,
      diff: Math.abs(thisMonthSum - lastMonthPartialSum),
      thisMonthGraphData: [0, ...thisMonthGraphData],
      lastMonthGraphData: [0, ...lastMonthGraphData],
    };
  }, [stats, lastMonthExpenses, thisMonthFullExpenses]);

  // Loading State
  if (loadingCurrent || loadingStats) {
    return (
      <div className="flex justify-center items-center h-[50vh]">
        <RefreshCircleOutline
          color="inherit"
          height="32px"
          width="32px"
          cssClasses="animate-spin text-tertiary"
        />
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-fade-in">
      {/* Hero Section */}
      <header className="flex flex-col space-y-4 pt-4">
        <div>
          <span className="text-sm font-semibold text-tertiary uppercase tracking-wider">
            {format(new Date(), "MMMM yyyy")}
          </span>
          <div className="flex items-baseline mt-1 space-x-1">
            <span className="text-5xl font-semibold text-primary tracking-tight">
              <CountUp value={currentMonthTotal} />
            </span>
            <span className="text-lg text-tertiary font-normal">.00</span>
          </div>
        </div>

        {/* Intelligent Insight Pill */}
        <button
          onClick={() => setShowInsightSheet(true)}
          className={`group relative w-full sm:w-auto flex items-center justify-between p-3 pr-4 
            bg-white dark:bg-white/5 border
            rounded-2xl shadow-sm hover:shadow-md transition-all duration-300
            active:scale-[0.98]
            ${
              trendDirection === "down"
                ? "animate-glow-green border-emerald-500/20"
                : "animate-glow-red border-rose-500/20"
            }`}
        >
          <div className="flex items-center space-x-3">
            <div
              className={`
               w-10 h-10 rounded-full flex items-center justify-center
               ${
                 trendDirection === "down"
                   ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
                   : "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400"
               }
             `}
            >
              {trendDirection === "down" ? (
                <TrendingDownOutline
                  color="inherit"
                  height="20px"
                  width="20px"
                  cssClasses="text-current"
                />
              ) : (
                <TrendingUpOutline
                  color="inherit"
                  height="20px"
                  width="20px"
                  cssClasses="text-current"
                />
              )}
            </div>
            <div className="text-left">
              <p
                className={`text-sm font-semibold ${
                  trendDirection === "down"
                    ? "text-emerald-700 dark:text-emerald-400"
                    : "text-rose-700 dark:text-rose-400"
                }`}
              >
                {trendDirection === "down" ? "Under Budget" : "Spending High"}
              </p>
              <p className="text-xs text-tertiary">
                {percentageChange}%{" "}
                {trendDirection === "down" ? "less" : "more"} than last month
              </p>
            </div>
          </div>
          <ArrowForwardOutline
            color="inherit"
            height="16px"
            width="16px"
            cssClasses="text-tertiary group-hover:text-primary transition-colors"
          />
        </button>
      </header>

      {/* Grouped Transactions */}
      <section className="space-y-4">
        <h3 className="text-sm font-semibold text-tertiary px-1 uppercase tracking-wider">
          Recent Transactions
        </h3>

        <div className="space-y-2">
          {recentExpenses.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-subtle rounded-3xl">
              <p className="text-tertiary text-sm">No expenses yet.</p>
            </div>
          ) : (
            <motion.div
              variants={container}
              initial="hidden"
              animate="show"
              className="flex flex-col space-y-[2px]" // Tight spacing for list
              layout
            >
              <AnimatePresence mode="popLayout" initial={false}>
                {recentExpenses.map((t) => (
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
