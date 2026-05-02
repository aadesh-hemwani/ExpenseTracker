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

// --- Sub-Components for Redesigned Transactions List ---

const ExpenseCard = ({
  t,
  onClick,
  onDelete,
  onEdit,
  isSmall
}: {
  t: Expense;
  onClick: (e: Expense) => void;
  onDelete: (id: string, amount: number, date: any) => void;
  onEdit: (e: Expense) => void;
  isSmall: boolean;
}) => {
  const amount = Number(t.amount).toLocaleString("en-IN");
  const time = t.date instanceof Timestamp
    ? format(t.date.toDate(), "hh:mm a")
    : format(new Date(t.date), "hh:mm a");

  const accentColor = CATEGORY_COLORS[t.category as keyof typeof CATEGORY_COLORS] || "#A0A0A0";
  const [showActions, setShowActions] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const timerRef = useRef<any>(null);

  const startPress = () => {
    if (showActions || showConfirm) return;
    timerRef.current = setTimeout(() => {
      setShowActions(true);
      if (navigator.vibrate) navigator.vibrate(50);
    }, 600); // Slightly faster long press
  };

  const endPress = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  };

  const handleClick = (e: React.MouseEvent) => {
    if (showActions || showConfirm) {
      setShowActions(false);
      setShowConfirm(false);
      return;
    }
    onClick(t);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowConfirm(true);
    setShowActions(false);
  };

  const handleConfirmDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(t.id, Number(t.amount), t.date);
    setShowConfirm(false);
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit(t);
    setShowActions(false);
  };

  return (
    <motion.div
      className="relative w-full h-full select-none"
      onContextMenu={(e: React.MouseEvent) => e.preventDefault()}
      layout
    >
      <motion.button
        whileTap={{ scale: 0.98 }}
        onPointerDown={startPress}
        onPointerUp={endPress}
        onPointerLeave={endPress}
        onClick={handleClick}
        className="bg-white dark:bg-[#1C1C1E] rounded-[22px] p-2 flex flex-col items-start text-left w-full h-full relative overflow-hidden group border border-black/5 dark:border-white/5 transition-colors hover:bg-zinc-50 dark:hover:bg-[#252529]"
      >
        {/* Neutral Accent Tint */}
        <div
          className="absolute inset-0 opacity-[0.03] transition-opacity group-hover:opacity-[0.06] bg-zinc-400 dark:bg-white/5"
        />

        {/* Category Watermark Icon */}
        <div className="absolute right-2 top-2 opacity-[0.12] dark:opacity-[0.18] pointer-events-none transition-opacity group-hover:opacity-[0.25]">
          {getCategoryIcon(t.category, "32px")}
        </div>

        <div className="w-full mb-0.5">
          <span className={`font-bold text-zinc-900 dark:text-white tracking-tight whitespace-nowrap ${amount.length >= 8 ? 'text-base' : amount.length >= 6 ? 'text-lg' : 'text-xl'
            }`}>
            ₹{amount}
          </span>
        </div>
        {(() => {
          const rawNote = String(t.note || t.category || "");
          if (rawNote.includes('-')) {
            const [main, ...rest] = rawNote.split('-');
            const subNote = rest.join('-').trim();

            if (isSmall) {
              return (
                <div className="flex flex-col mb-3 w-[85%]">
                  <span className="text-[11px] font-medium text-zinc-500 dark:text-white/90 line-clamp-1">
                    {main.trim()}
                  </span>
                  {subNote && (
                    <span className="text-[9.5px] font-medium text-zinc-400 dark:text-white/50 line-clamp-1 mt-0.5">
                      {subNote}
                    </span>
                  )}
                </div>
              );
            }

            return (
              <div className="flex items-center gap-2 mb-3 w-[90%] overflow-hidden">
                <span className="text-[11px] font-medium text-zinc-500 dark:text-white/90 whitespace-nowrap">
                  {main.trim()}
                </span>
                {subNote && (
                  <>
                    <div className="w-1 h-1 rounded-full bg-zinc-300 dark:bg-white/20 shrink-0" />
                    <span className="text-[11px] font-medium text-zinc-400 dark:text-white/50 line-clamp-1">
                      {subNote}
                    </span>
                  </>
                )}
              </div>
            );
          }
          return (
            <span className="text-[11px] font-medium text-zinc-500 dark:text-white/90 line-clamp-1 mb-3 w-[85%]">
              {rawNote}
            </span>
          );
        })()}

        <div className={`mt-auto flex ${isSmall ? 'flex-col' : 'flex-row justify-between items-center'} w-full`}>
          <div className="flex items-center gap-1">
            <div className="w-1 h-1 rounded-full shrink-0" style={{ backgroundColor: accentColor }} />
            <span className="text-[9px] text-zinc-400 dark:text-[#A0A0A0] font-bold uppercase tracking-wider truncate">{t.category}</span>
          </div>
          <span className="text-[9px] text-zinc-500 dark:text-[#A0A0A0]/60 font-medium">{time}</span>
        </div>
      </motion.button>

      {/* Actions Overlay */}
      <AnimatePresence>
        {showActions && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="absolute inset-0 z-30 bg-white/95 dark:bg-[#1C1C1E]/95 rounded-[22px] flex items-center justify-center gap-4 backdrop-blur-sm"
          >
            <button
              onClick={handleEdit}
              className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-white/10 flex items-center justify-center text-zinc-900 dark:text-white active:scale-90 transition-transform shadow-sm"
            >
              <Edit2 size={18} />
            </button>
            <button
              onClick={handleDeleteClick}
              className="w-10 h-10 rounded-full bg-red-500/10 dark:bg-red-500/20 flex items-center justify-center text-red-500 active:scale-90 transition-transform"
            >
              <Trash2 size={18} />
            </button>
            <button
              onClick={() => setShowActions(false)}
              className="absolute top-2 right-2 p-1 text-zinc-400 dark:text-white/40 hover:text-zinc-900 dark:hover:text-white"
            >
              <X size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Overlay */}
      <AnimatePresence>
        {showConfirm && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="absolute inset-0 z-40 bg-red-500 rounded-[22px] flex flex-col items-center justify-center p-2 text-white"
          >
            <span className="text-[10px] font-bold uppercase tracking-wider mb-2">Are you sure?</span>
            <div className={`flex ${isSmall ? 'flex-col gap-1.5' : 'flex-row gap-2'} w-full px-1`}>
              <button
                onClick={handleConfirmDelete}
                className="flex-1 py-1.5 bg-white text-red-500 rounded-full text-[10px] font-bold active:scale-95 transition-transform"
              >
                Delete
              </button>
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 py-1.5 bg-black/20 text-white rounded-full text-[10px] font-bold active:scale-95 transition-transform"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const ExpenseGrid = ({
  expenses,
  onCardClick,
  onCardDelete,
  onCardEdit
}: {
  expenses: Expense[],
  onCardClick: (e: Expense) => void;
  onCardDelete: (id: string, amount: number, date: any) => void;
  onCardEdit: (e: Expense) => void;
}) => {
  const count = expenses.length;

  return (
    <div className="grid grid-cols-6 gap-1.5">
      <AnimatePresence mode="popLayout" initial={false}>
        {expenses.map((t, i) => {
          let colSpan = "col-span-2"; // default (3 columns)
          let isSmall = true;
          if (count === 1) { colSpan = "col-span-6"; isSmall = false; }
          else if (count === 2) { colSpan = "col-span-3"; isSmall = false; }
          else if (count === 3) { colSpan = "col-span-2"; isSmall = true; }
          else if (count === 4) { colSpan = "col-span-3"; isSmall = false; }
          else if (count === 5) {
            colSpan = i < 2 ? "col-span-3" : "col-span-2";
            isSmall = i >= 2;
          }

          return (
            <motion.div
              key={t.id}
              className={colSpan}
              variants={item}
              layout
            >
              <ExpenseCard t={t} onClick={onCardClick} onDelete={onCardDelete} onEdit={onCardEdit} isSmall={isSmall} />
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};

const DaySection = ({
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
  const maxAmount = Math.max(...expenses.map(e => Number(e.amount)), 1);
  const chronologicalExpenses = [...expenses].reverse();

  return (
    <div className="space-y-3 bg-zinc-50/50 dark:bg-[#141414] p-2 rounded-[28px] border border-black/10 dark:border-white/10 shadow-sm">
      <div className="flex justify-between items-center px-2">
        <span className="text-[10px] font-bold text-zinc-400 dark:text-[#A0A0A0] uppercase tracking-[0.25em]">{label}</span>
        <div className="flex items-center gap-3">
          {/* Horizontal Stacked Category Bar */}
          <div className="flex w-12 h-1 rounded-full overflow-hidden">
            {Object.entries(
              expenses.reduce((acc, e) => {
                acc[e.category] = (acc[e.category] || 0) + Number(e.amount);
                return acc;
              }, {} as Record<string, number>)
            )
              .sort((a, b) => b[1] - a[1]) // Largest category first
              .map(([cat, amt]) => (
                <div
                  key={cat}
                  style={{
                    width: `${(amt / dailyTotal) * 100}%`,
                    minWidth: "4px",
                    backgroundColor: CATEGORY_COLORS[cat as keyof typeof CATEGORY_COLORS] || '#A0A0A0'
                  }}
                />
              ))}
          </div>
          <span className="text-sm font-bold text-zinc-900 dark:text-white">₹{dailyTotal.toLocaleString("en-IN")}</span>
        </div>
      </div>
      <ExpenseGrid expenses={expenses} onCardClick={onCardClick} onCardDelete={onCardDelete} onCardEdit={onCardEdit} />
    </div>
  );
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
    <div className="space-y-10">
      <header className="sticky top-0 z-50 -mx-5 -mt-[calc(env(safe-area-inset-top)+2rem)] mb-10">
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

      <section className="space-y-6">
        <div className="flex items-center justify-between px-2">
          <h3 className="text-xl font-bold text-zinc-900 dark:text-white tracking-tight">Recent Activity</h3>
        </div>

        <div className="space-y-4">
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
                  onCardClick={(expense) => openModal("view", expense)}
                  onCardDelete={deleteExpense}
                  onCardEdit={(expense) => openModal("edit", expense)}
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
