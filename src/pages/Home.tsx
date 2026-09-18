import React, { useMemo } from "react";
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
import { useAuth } from "../context/AuthContext";
import HeroBalance from "../components/HeroBalance";
import { useGlobalModal } from "../context/GlobalModalContext";
import { ExpenseCard } from "../components/ExpenseCard";
import { HeroBalanceSkeleton, ExpenseCardSkeleton } from "../components/ui/Skeleton";

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0 },
};

interface DaySectionProps {
  label: string;
  expenses: Expense[];
  onCardClick: (e: Expense) => void;
  onCardDelete: (id: string, amount: number, date: Timestamp | Date) => void;
  onCardEdit: (e: Expense) => void;
}

const DaySection = React.memo(({
  label,
  expenses,
  onCardClick,
  onCardDelete,
  onCardEdit
}: DaySectionProps) => {
  const dailyTotal = useMemo(() =>
    expenses.reduce((sum, e) => sum + Number(e.amount), 0),
    [expenses]
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-between items-end px-2">
        <span className="text-[14px] font-semibold text-secondary tracking-tight">
          {label}
        </span>
        <span className="text-[14px] font-bold text-primary tracking-tight">
          ₹{dailyTotal.toLocaleString("en-IN")}
        </span>
      </div>
      <div className="flex flex-col gap-0">
        <AnimatePresence mode="popLayout" initial={false}>
          {expenses.map((expense) => (
            <motion.div key={expense.id} variants={itemVariants} layout>
              <ExpenseCard
                expense={expense}
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

DaySection.displayName = "DaySection";

const Home = React.memo(() => {
  const navigate = useNavigate();
  const { stats, loading: loadingStats } = useMonthlyStats();
  const { deleteExpense } = useExpenses();
  const { user } = useAuth();
  const { openModal } = useGlobalModal();

  const firstName = useMemo(() =>
    user?.displayName ? user.displayName.split(" ")[0] : "",
    [user?.displayName]
  );

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
    false // No need to subscribe to a month that is already finished
  );

  const greeting = useMemo(() => {
    const hour = now.getHours();
    const isWeekend = [0, 6].includes(now.getDay());

    let pool: string[] = [];

    if (hour >= 0 && hour < 4) pool = ["Up late", "Burning the midnight oil", "Still awake", "Quiet hours"];
    else if (hour >= 4 && hour < 7) pool = ["Early bird", "Rise and shine", "Up before the sun", "Peaceful morning"];
    else if (hour >= 7 && hour < 12) pool = ["Good morning", "Ready for the day", "Fresh start", "Let's get it"];
    else if (hour >= 12 && hour < 14) pool = ["Almost noon", "Lunch time", "Good afternoon"];
    else if (hour >= 14 && hour < 17) pool = ["Good afternoon", "Afternoon push", "Keep it up", "Doing great"];
    else if (hour >= 17 && hour < 21) pool = ["Good evening", "Evening check-in"];
    else pool = ["Good night", "Late evening"];

    if (isWeekend) pool.push("Happy weekend", "Weekend vibes", "Enjoy your weekend");

    return pool[Math.floor(Math.random() * pool.length)];
  }, [now]);

  const handleCardClick = React.useCallback((expense: Expense) => {
    openModal("view", expense);
  }, [openModal]);

  const handleCardEdit = React.useCallback((expense: Expense) => {
    openModal("edit", expense);
  }, [openModal]);

  const handleCardDelete = React.useCallback((id: string, amount: number, date: Timestamp | Date) => {
    deleteExpense(id, amount, date);
  }, [deleteExpense]);

  const recentExpenses = useMemo(() => {
    return [...thisMonthFullExpenses, ...lastMonthExpenses]
      .sort((a, b) => {
        const tA = a.date instanceof Timestamp ? a.date.toMillis() : new Date(a.date).getTime();
        const tB = b.date instanceof Timestamp ? b.date.toMillis() : new Date(b.date).getTime();
        return tB - tA;
      })
      .slice(0, 18);
  }, [thisMonthFullExpenses, lastMonthExpenses]);

  const metrics = useMemo(() => {
    const currentDay = now.getDate();
    const thisMonthSum = thisMonthFullExpenses.reduce((sum, e) => sum + Number(e.amount), 0);

    const lastMonthPartialSum = lastMonthExpenses.reduce((acc, e) => {
      const d = e.date instanceof Timestamp ? e.date.toDate() : new Date(e.date);
      if (d && d.getDate() <= currentDay) return acc + Number(e.amount);
      return acc;
    }, 0);

    let pctChange = 0;
    if (lastMonthPartialSum > 0) {
      pctChange = ((thisMonthSum - lastMonthPartialSum) / lastMonthPartialSum) * 100;
    }

    const avg = currentDay > 0 ? thisMonthSum / currentDay : 0;

    return {
      total: thisMonthSum,
      percentageChange: Math.abs(pctChange).toFixed(0),
      trendDirection: (thisMonthSum > lastMonthPartialSum ? "up" : "down") as "up" | "down",
      dailyAverage: avg,
    };
  }, [lastMonthExpenses, thisMonthFullExpenses, now]);

  const groupedRecentExpenses = useMemo(() => {
    const groups: Record<string, Expense[]> = {};
    const todayStr = format(now, "yyyy-MM-dd");
    const yesterdayStr = format(new Date(now.getTime() - 86400000), "yyyy-MM-dd");

    recentExpenses.forEach((expense) => {
      const date = expense.date instanceof Timestamp ? expense.date.toDate() : new Date(expense.date);
      const dateStr = format(date, "yyyy-MM-dd");

      let dateLabel = format(date, "MMM dd");
      if (dateStr === todayStr) dateLabel = "Today";
      else if (dateStr === yesterdayStr) dateLabel = "Yesterday";

      if (!groups[dateLabel]) groups[dateLabel] = [];
      groups[dateLabel].push(expense);
    });

    return Object.entries(groups);
  }, [recentExpenses, now]);

  if (loadingCurrent || loadingStats) {
    return (
      <div className="space-y-8 pb-12">
        <header className="-mx-5">
          <HeroBalanceSkeleton />
        </header>
        <div className="space-y-4">
          <div className="flex justify-between items-center px-1">
            <div className="w-32 h-6 bg-gray-200 dark:bg-white/10 animate-pulse rounded-md" />
          </div>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map(i => <ExpenseCardSkeleton key={i} />)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-12">
      <header className="sticky top-0 z-50 -mx-5">
        <HeroBalance
          currentBalance={metrics.total}
          budgetAmount={user?.monthlyBudgetCap}
          trendDirection={metrics.trendDirection}
          percentageChange={metrics.percentageChange}
          dailyAverage={metrics.dailyAverage}
          greeting={greeting}
          firstName={firstName}
          isTopHero={true}
          onTrendClick={() => navigate("/analytics", { state: { scrollToTrajectory: true } })}
          onAmountClick={() => navigate("/history", { state: { viewMode: "analysis" } })}
        />
      </header>

      <section className="space-y-3.5">
        <h3 className="text-xl font-bold text-zinc-900 dark:text-white tracking-tight">
          Recent Activity
        </h3>

        <div className="space-y-6 pb-6">
          {recentExpenses.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 bg-secondary/30 dark:bg-white/[0.02] rounded-[24px] border border-subtle/50">
              <div className="w-12 h-12 rounded-full bg-secondary/50 dark:bg-white/5 flex items-center justify-center mb-4">
                <span className="text-2xl opacity-50">💸</span>
              </div>
              <h4 className="text-[17px] font-semibold text-primary mb-1">No Recent Expenses</h4>
              <p className="text-tertiary text-[15px] text-center max-w-[250px]">Your recent activity will appear here once you add an expense.</p>
            </div>
          ) : (
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="show"
              className="flex flex-col space-y-6"
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
});

Home.displayName = "Home";

export default Home;
