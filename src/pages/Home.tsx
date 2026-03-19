import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

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
import { getCategoryBreakdown } from "../utils/analyticsHelpers";

import IOSSpinner from "../components/ui/IOSSpinner";
import { useAuth } from "../context/AuthContext";
import HeroBalance from "../components/HeroBalance";
import { useGlobalModal } from "../context/GlobalModalContext";

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
  const navigate = useNavigate();
  const { stats, loading: loadingStats } = useMonthlyStats();
  const { deleteExpense } = useExpenses();

  const { user } = useAuth();
  const { openModal } = useGlobalModal();

  const [greeting, setGreeting] = useState("Good day");
  const firstName = user?.displayName ? user.displayName.split(" ")[0] : "";

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) setGreeting("Good morning");
    else if (hour >= 12 && hour < 17) setGreeting("Good afternoon");
    else setGreeting("Good evening");
  }, []);

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
    topCategory,
    dailyAverage,
  } = useMemo(() => {
    const currentDay = now.getDate();

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

    // 4. Analytics Extras
    const categoryData = getCategoryBreakdown(thisMonthFullExpenses);
    const topCat = categoryData.length > 0 ? categoryData[0].name : "None";
    const avg = currentDay > 0 ? thisMonthSum / currentDay : 0;

    return {
      currentMonthTotal: thisMonthSum,
      percentageChange: Math.abs(pctChange).toFixed(0),
      trendDirection: (isTrendingUp ? "up" : "down") as "up" | "down",
      topCategory: topCat,
      dailyAverage: avg,
    };
  }, [lastMonthExpenses, thisMonthFullExpenses]);

  // Memoize grouped recent expenses
  const groupedRecentExpenses = useMemo(() => {
    return Object.entries(
      recentExpenses.reduce((acc, expense) => {
        const date =
          expense.date instanceof Timestamp
            ? expense.date.toDate()
            : new Date(expense.date);

        let dateLabel = format(date, "MMM dd");
        const todayStr = format(now, "yyyy-MM-dd");
        const yesterdayStr = format(new Date(now.getTime() - 86400000), "yyyy-MM-dd");
        const dateStr = format(date, "yyyy-MM-dd");

        if (dateStr === todayStr) {
          dateLabel = "Today";
        } else if (dateStr === yesterdayStr) {
          dateLabel = "Yesterday";
        }

        if (!acc[dateLabel]) acc[dateLabel] = [];
        acc[dateLabel].push(expense);
        return acc;
      }, {} as Record<string, Expense[]>)
    );
  }, [recentExpenses, now]);

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
      <header className="flex flex-col space-y-6 pt-6 relative">
        <div className="flex flex-col px-2 mb-2">
          <p className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
            {greeting}{firstName ? `, ${firstName}` : ""}
          </p>
          <p className="text-lg font-medium text-gray-500 dark:text-gray-400 mt-0.5">
            {format(now, "MMMM yyyy")}
          </p>
        </div>

        {/* Balance Card Component */}
        <HeroBalance
          currentBalance={currentMonthTotal}
          budgetAmount={user?.monthlyBudgetCap}
          trendDirection={trendDirection}
          percentageChange={percentageChange}
          topCategory={topCategory}
          dailyAverage={dailyAverage}
          onTrendClick={() =>
            navigate("/analytics", { state: { scrollToTrajectory: true } })
          }
        />
      </header>

      {/* Grouped Transactions */}
      <section className="space-y-4">


        <div className="space-y-2">
          {recentExpenses.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 dark:bg-white/5 rounded-3xl">
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
              {groupedRecentExpenses.map(([label, expenses], index) => (
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
                            onClick={(expense) => openModal("view", expense)}
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
    </div>
  );
};

export default Home;
