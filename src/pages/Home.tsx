import { useMemo, useState } from "react";
import TrendingUpOutline from "react-ionicons/lib/TrendingUpOutline";
import TrendingDownOutline from "react-ionicons/lib/TrendingDownOutline";
import ArrowForwardOutline from "react-ionicons/lib/ArrowForwardOutline";
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
import IOSSpinner from "../components/ui/IOSSpinner";

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

  // Fetch Data: simplified hooks (cache-first)
  const { expenses: lastMonthExpenses } = useExpensesForMonth(
    lastMonthDate,
    stats,
    !loadingStats
  );

  const { expenses: thisMonthFullExpenses, loading: loadingCurrent } =
    useExpensesForMonth(now, stats, !loadingStats);

  // Simplified: Merge and Sort
  const recentExpenses = useMemo(() => {
    return [...thisMonthFullExpenses, ...lastMonthExpenses]
      .sort((a, b) => {
        // Use timestamp comparison directly if possible, else helper
        const tA =
          a.date instanceof Timestamp ? a.date.toMillis() : Number(a.date);
        const tB =
          b.date instanceof Timestamp ? b.date.toMillis() : Number(b.date);
        return tB - tA;
      })
      .slice(0, 20);
  }, [thisMonthFullExpenses, lastMonthExpenses]);

  // Metrics Calculation
  const {
    currentMonthTotal,
    percentageChange,
    trendDirection,
    lastMonthPartialSum,
    diff,
    thisMonthGraphData,
    lastMonthGraphData,
  } = useMemo(() => {
    const currentDay = now.getDate();
    const daysInMonth = 31; // Simplification for graph visuals

    // 1. Current Month Total
    const thisMonthSum = thisMonthFullExpenses.reduce(
      (sum, e) => sum + Number(e.amount),
      0
    );

    // 2. Last Month Partial (Compare up to same day)
    const lastMonthPartialSum = lastMonthExpenses.reduce((acc, e) => {
      const d = e.date instanceof Timestamp ? e.date.toDate() : e.date;
      // @ts-ignore
      if (d && d.getDate() <= currentDay) return acc + Number(e.amount);
      return acc;
    }, 0);

    // 3. Trends
    let pctChange = 0;
    if (lastMonthPartialSum > 0) {
      pctChange =
        ((thisMonthSum - lastMonthPartialSum) / lastMonthPartialSum) * 100;
    }
    const isTrendingUp = thisMonthSum > lastMonthPartialSum;

    // 4. Graph Data Helpers
    const getDailyCumulative = (list: Expense[]) => {
      const totals = new Array(daysInMonth).fill(0);
      list.forEach((e) => {
        const d = e.date instanceof Timestamp ? e.date.toDate() : e.date;
        // @ts-ignore
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

    const thisGraph = getDailyCumulative(thisMonthFullExpenses).slice(
      0,
      currentDay
    );
    const lastGraph = getDailyCumulative(lastMonthExpenses).slice(
      0,
      currentDay
    );

    return {
      currentMonthTotal: thisMonthSum,
      percentageChange: Math.abs(pctChange).toFixed(0),
      trendDirection: (isTrendingUp ? "up" : "down") as "up" | "down",
      lastMonthPartialSum,
      lastMonthDate,
      diff: Math.abs(thisMonthSum - lastMonthPartialSum),
      thisMonthGraphData: [0, ...thisGraph],
      lastMonthGraphData: [0, ...lastGraph],
    };
  }, [lastMonthExpenses, thisMonthFullExpenses]);

  // Loading State
  if (loadingCurrent || loadingStats) {
    return (
      <div className="flex justify-center items-center h-[50vh]">
        <IOSSpinner size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-fade-in">
      {/* Hero Section */}
      <header className="flex flex-col space-y-2 pt-4">
        <div>
          <span className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            {format(new Date(), "MMMM yyyy")}
          </span>
          <div className="flex items-baseline mt-1 space-x-1">
            <span className="text-5xl font-semibold text-primary tracking-tight">
              <CountUp value={currentMonthTotal} />
            </span>
            <span className="text-lg text-tertiary font-normal">
              .{currentMonthTotal.toFixed(2).split(".")[1]}
            </span>
          </div>
        </div>

        {/* Intelligent Insight Pill */}
        <button
          onClick={() => setShowInsightSheet(true)}
          className={`group relative w-full sm:w-auto flex items-center justify-between p-3 pr-4 
            bg-white dark:bg-white/5 bg-gradient-to-br from-white to-gray-50 dark:from-white/10 dark:to-white/5 border
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
              className="flex flex-col space-y-2"
              layout
            >
              {Object.entries(
                recentExpenses.reduce((acc, expense) => {
                  const date =
                    expense.date instanceof Timestamp
                      ? expense.date.toDate()
                      : new Date(expense.date);

                  let dateLabel = format(date, "MMM dd");
                  if (
                    format(date, "yyyy-MM-dd") ===
                    format(new Date(), "yyyy-MM-dd")
                  ) {
                    dateLabel = "Today";
                  } else if (
                    format(date, "yyyy-MM-dd") ===
                    format(new Date(Date.now() - 86400000), "yyyy-MM-dd")
                  ) {
                    dateLabel = "Yesterday";
                  }

                  if (!acc[dateLabel]) acc[dateLabel] = [];
                  acc[dateLabel].push(expense);
                  return acc;
                }, {} as Record<string, Expense[]>)
              ).map(([label, expenses], index) => (
                <div
                  key={label}
                  className={`space-y-2 ${index > 0 ? "pt-3" : ""}`}
                >
                  <h4 className="sticky top-0 z-20 py-2 bg-body/95 backdrop-blur-xl text-xs font-bold text-tertiary/80 uppercase tracking-widest px-1 transition-colors">
                    {label}
                  </h4>
                  <div className="space-y-2">
                    <AnimatePresence mode="popLayout" initial={false}>
                      {expenses.map((t) => (
                        <motion.div key={t.id} variants={item} layout>
                          <SwipeableExpenseItem
                            t={t}
                            getCategoryIcon={getCategoryIcon}
                            onDelete={deleteExpense}
                            hideDate={true}
                          />
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                </div>
              ))}
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
