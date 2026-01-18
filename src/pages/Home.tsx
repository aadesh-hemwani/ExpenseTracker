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
    !loadingStats,
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
      0,
    );

    // 2. Last Month Partial (Compare up to same day)
    const lastMonthPartialSum = lastMonthExpenses.reduce((acc, e) => {
      const d =
        e.date instanceof Timestamp ? e.date.toDate() : new Date(e.date);
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
        const d =
          e.date instanceof Timestamp ? e.date.toDate() : new Date(e.date);
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
      currentDay,
    );
    const lastGraph = getDailyCumulative(lastMonthExpenses).slice(
      0,
      currentDay,
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
      <header className="flex flex-col space-y-6 pt-4 relative">
        <div className="flex items-center justify-between px-2">
          <div>
            <p className="text-lg font-bold text-tertiary uppercase tracking-widest">
              {format(new Date(), "MMMM yyyy")}
            </p>
          </div>
        </div>

        {/* Balance Card */}
        <div className="liquid-card relative overflow-hidden rounded-[2rem] p-6 sm:p-8 hover:scale-[1.01] transition-transform duration-500">
          <div className="relative z-10 flex flex-col items-center justify-center space-y-1">
            <span className="text-xs font-semibold text-tertiary uppercase tracking-wider">
              Total Spent
            </span>
            <div className="flex items-baseline space-x-1 mt-2">
              <span className="text-6xl font-light tracking-tight text-primary drop-shadow-sm">
                <CountUp value={currentMonthTotal} />
              </span>
              <span className="text-2xl text-tertiary font-light mb-1">
                .{currentMonthTotal.toFixed(2).split(".")[1]}
              </span>
            </div>
          </div>

          <div className="mt-6 flex justify-center">
            <button
              onClick={() => setShowInsightSheet(true)}
              className={`group liquid-pill flex items-center space-x-2 border-0
               ${
                 trendDirection === "down"
                   ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20"
                   : "bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20"
               }`}
            >
              {trendDirection === "down" ? (
                <TrendingDownOutline
                  color="currentColor"
                  height="16px"
                  width="16px"
                />
              ) : (
                <TrendingUpOutline
                  color="currentColor"
                  height="16px"
                  width="16px"
                />
              )}
              <span className="text-xs font-bold uppercase tracking-wider">
                {percentageChange}%{" "}
                {trendDirection === "down" ? "Lower" : "Higher"}
              </span>
              <ArrowForwardOutline
                color="currentColor"
                height="14px"
                width="14px"
                cssClasses="opacity-50 group-hover:opacity-100 transition-opacity"
              />
            </button>
          </div>
        </div>
      </header>

      {/* Grouped Transactions */}
      <section className="space-y-4">
        <h3 className="text-xs font-bold text-tertiary px-1 uppercase tracking-wider">
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
                recentExpenses.reduce(
                  (acc, expense) => {
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
                  },
                  {} as Record<string, Expense[]>,
                ),
              ).map(([label, expenses], index) => (
                <div
                  key={label}
                  className={`space-y-2 ${index > 0 ? "pt-3" : ""}`}
                >
                  <h4 className="sticky top-0 z-20 py-2 bg-transparent text-xs font-bold text-tertiary uppercase tracking-wider px-1">
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
