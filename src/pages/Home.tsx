import { useMemo, useState, useEffect, useRef } from "react";
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
import { getCategoryIcon, CATEGORY_COLORS } from "../utils/uiUtils";
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

import { Trash2, Edit2, X } from "lucide-react";
import React from "react";
import { ExpenseCard } from "../components/ExpenseCard";

const DaySection = React.memo(({
  label,
  expenses,
  onCardClick,
  onCardDelete,
  onCardEdit
}: {
  label: string,
  expenses: Expense[],
  onCardClick: (e: Expense) => void;
  onCardDelete: (id: string, amount: number, date: any) => void;
  onCardEdit: (e: Expense) => void;
}) => {
  const dailyTotal = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

  return (
    <div className="space-y-2.5">
      <div className="flex justify-between items-center px-1">
        <span className="text-[10px] font-bold text-zinc-400 dark:text-[#A0A0A0] uppercase tracking-[0.25em]">{label}</span>
        <span className="text-sm font-bold text-zinc-900 dark:text-white">₹{dailyTotal.toLocaleString("en-IN")}</span>
      </div>
      <div className="space-y-2">
        <AnimatePresence mode="popLayout" initial={false}>
          {expenses.map((t) => (
            <motion.div key={t.id} variants={item} layout>
              <ExpenseCard
                t={t}
                onClick={onCardClick}
                onDelete={onCardDelete}
                onEdit={onCardEdit}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
});

const Home = () => {
  const navigate = useNavigate();
  const { stats, loading: loadingStats } = useMonthlyStats();
  const { deleteExpense } = useExpenses();

  const { user } = useAuth();
  const { openModal } = useGlobalModal();

  const [greeting, setGreeting] = useState("Good day");
  const firstName = user?.displayName ? user.displayName.split(" ")[0] : "";

  const now = useMemo(() => new Date(), []);
  const lastMonthDate = useMemo(() => subMonths(now, 1), [now]);

  const { expenses: thisMonthFullExpenses, loading: loadingCurrent } = useExpensesForMonth(
    now,
    stats,
    !loadingStats,
    true
  );

  const { expenses: lastMonthExpenses } = useExpensesForMonth(
    lastMonthDate,
    stats,
    !loadingStats,
    true
  );

  useEffect(() => {
    const now = new Date();
    const hour = now.getHours();
    const isWeekend = [0, 6].includes(now.getDay());

    let pool: string[] = [];

    if (hour >= 0 && hour < 4) {
      pool = ["Up late", "Burning the midnight oil", "Still awake", "Quiet hours"];
    } else if (hour >= 4 && hour < 7) {
      pool = ["Early bird", "Rise and shine", "Up before the sun", "Peaceful morning"];
    } else if (hour >= 7 && hour < 12) {
      pool = ["Good morning", "Ready for the day", "Fresh start", "Let's get it"];
    } else if (hour >= 12 && hour < 14) {
      pool = ["Almost noon", "Lunch time", "Good afternoon"];
    } else if (hour >= 14 && hour < 17) {
      pool = ["Good afternoon", "Afternoon push", "Keep it up", "Doing great"];
    } else if (hour >= 17 && hour < 21) {
      pool = ["Good evening", "Evening check-in"];
    } else {
      pool = ["Good night", "Late evening"];
    }

    if (isWeekend) {
      pool.push("Happy weekend", "Weekend vibes", "Enjoy your weekend");
    }

    const randomChoice = pool[Math.floor(Math.random() * pool.length)];
    setGreeting(randomChoice);
  }, []);

  // Stable callbacks for memoized children
  const handleCardClick = React.useCallback((expense: Expense) => {
    openModal("view", expense);
  }, [openModal]);

  const handleCardEdit = React.useCallback((expense: Expense) => {
    openModal("edit", expense);
  }, [openModal]);

  const handleCardDelete = React.useCallback((id: string, amount: number, date: any) => {
    deleteExpense(id, amount, date);
  }, [deleteExpense]);

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
      .slice(0, 18); // Show slightly fewer to keep grid dense
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
      (sum: number, e: Expense) => sum + Number(e.amount),
      0,
    );

    // 2. Last Month Partial (Compare up to same day)
    const lastMonthPartialSum = lastMonthExpenses.reduce((acc: number, e: Expense) => {
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
  }, [lastMonthExpenses, thisMonthFullExpenses, now]);

  // Memoize grouped recent expenses
  const groupedRecentExpenses = useMemo(() => {
    const groups: Record<string, Expense[]> = {};

    recentExpenses.forEach((expense) => {
      const date =
        expense.date instanceof Timestamp
          ? expense.date.toDate()
          : new Date(expense.date);

      const todayStr = format(now, "yyyy-MM-dd");
      const yesterdayStr = format(new Date(now.getTime() - 86400000), "yyyy-MM-dd");
      const dateStr = format(date, "yyyy-MM-dd");

      let dateLabel = format(date, "MMM dd");
      if (dateStr === todayStr) dateLabel = "Today";
      else if (dateStr === yesterdayStr) dateLabel = "Yesterday";

      if (!groups[dateLabel]) groups[dateLabel] = [];
      groups[dateLabel].push(expense);
    });

    return Object.entries(groups);
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
    <div className="space-y-10 pb-8">
      <header className="sticky top-0 z-50 -mx-5 -mt-[calc(env(safe-area-inset-top)+2rem)] mb-6">
        <HeroBalance
          currentBalance={currentMonthTotal}
          budgetAmount={user?.monthlyBudgetCap}
          trendDirection={trendDirection}
          percentageChange={percentageChange}
          topCategory={topCategory}
          dailyAverage={dailyAverage}
          greeting={greeting}
          firstName={firstName}
          isTopHero={true}
          onTrendClick={() =>
            navigate("/analytics", { state: { scrollToTrajectory: true } })
          }
          onAmountClick={() =>
            navigate("/history", { state: { viewMode: "analysis" } })
          }
        />
      </header>

      <section className="space-y-5">
        <div className="flex items-center justify-between px-2">
          <h3 className="text-xl font-bold text-zinc-900 dark:text-white tracking-tight">Recent Activity</h3>
        </div>

        <div className="space-y-4 pb-6">
          {recentExpenses.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 dark:bg-white/5 rounded-[24px]">
              <p className="text-tertiary text-sm">No expenses yet.</p>
            </div>
          ) : (
            <motion.div
              variants={container}
              initial="hidden"
              animate="show"
              className="flex flex-col space-y-4"
              layout
            >
              {groupedRecentExpenses.map(([label, expenses]) => (
                <DaySection
                  key={label}
                  label={label}
                  expenses={expenses}
                  onCardClick={handleCardClick}
                  onCardDelete={handleCardDelete}
                  onCardEdit={handleCardEdit}
                />
              ))}
            </motion.div>
          )}
        </div>
      </section>
    </div>
  );
};

export default Home;
