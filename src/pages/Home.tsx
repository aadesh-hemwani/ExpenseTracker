import { useMemo, useState } from "react";
import TrendingUpOutline from "react-ionicons/lib/TrendingUpOutline";
import TrendingDownOutline from "react-ionicons/lib/TrendingDownOutline";
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
import IOSSpinner from "../components/ui/IOSSpinner";
import TrajectoryChart from "../components/TrajectoryChart";
import { formatCurrency } from "../utils/formatUtils";
import { useAuth } from "../context/AuthContext";

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
  const { user } = useAuth();
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
        {/* Credit Card Style Glass Card */}
        <div
          className="relative w-full h-[240px] cursor-pointer group"
          onClick={() => setShowInsightSheet(!showInsightSheet)}
          style={{ perspective: "1000px" }}
        >
          <motion.div
            initial={false}
            animate={{ rotateY: showInsightSheet ? 180 : 0 }}
            transition={{
              duration: 0.6,
              type: "spring",
              stiffness: 260,
              damping: 20,
            }}
            className="w-full h-full relative"
            style={{ transformStyle: "preserve-3d" }}
          >
            {/* FRONT FACE */}
            <div
              className="absolute inset-0 liquid-card relative overflow-hidden rounded-[1.5rem] p-6 sm:p-7 hover:scale-[1.01] transition-all duration-500 cursor-pointer min-h-[220px] flex flex-col justify-between group bg-gradient-to-br from-blue-100/60 via-transparent to-accent/20 dark:from-blue-800/40 dark:via-transparent dark:to-accent/15"
              style={{ backfaceVisibility: "hidden" }}
            >
              {/* Noise Texture Overlay */}
              <div
                className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none z-0 mix-blend-overlay"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='1'/%3E%3C/svg%3E")`,
                }}
              ></div>

              {/* Top Row: Chip & Contactless */}
              <div className="relative z-10 flex justify-between items-start">
                <div className="w-12 h-9 rounded-lg bg-gradient-to-br from-yellow-100/80 via-yellow-400/60 to-yellow-600/80 border border-yellow-300/40 shadow-sm flex items-center justify-center relative overflow-hidden">
                  <div className="absolute inset-0 opacity-30 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-white via-transparent to-transparent"></div>
                  <div className="w-full h-[1px] bg-yellow-600/20 absolute top-1/2 -translate-y-1/2"></div>
                  <div className="h-full w-[1px] bg-yellow-600/20 absolute left-1/2 -translate-x-1/2"></div>
                </div>
                <div className="opacity-100 filter drop-shadow-sm">
                  <svg
                    width="42"
                    height="42"
                    viewBox="0 0 512 512"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <rect
                      x="130"
                      y="120"
                      width="260"
                      height="50"
                      rx="25"
                      ry="25"
                      fill="#00000000"
                      className="stroke-black dark:stroke-white"
                      stroke-width="5px"
                    />
                    <rect
                      x="130"
                      y="231"
                      width="250"
                      height="50"
                      rx="25"
                      ry="25"
                      fill="#00000000"
                      className="stroke-black dark:stroke-white"
                      stroke-width="5px"
                    />
                    <rect
                      x="130"
                      y="342"
                      width="260"
                      height="50"
                      rx="25"
                      ry="25"
                      fill="#00000000"
                      className="stroke-black dark:stroke-white"
                      stroke-width="5px"
                    />
                    <rect
                      x="155"
                      y="90"
                      width="50"
                      height="332"
                      rx="25"
                      ry="25"
                      className="stroke-black dark:stroke-white fill-[#f5f3ef] dark:fill-[#262522]"
                      stroke-width="5px"
                    />
                  </svg>
                </div>
              </div>

              {/* Middle: Balance */}
              <div className="relative z-10 py-2">
                <span className="text-[10px] font-bold text-tertiary/90 uppercase tracking-widest block mb-1">
                  Current Spendings
                </span>
                <div className="flex items-baseline space-x-1">
                  <span className="text-5xl font-light tracking-tight text-primary drop-shadow-sm font-sans">
                    <CountUp value={currentMonthTotal} />
                  </span>
                  <span className="text-xl text-tertiary font-light">
                    .{currentMonthTotal.toFixed(2).split(".")[1]}
                  </span>
                </div>
              </div>

              {/* Bottom: Card Number & Details */}
              <div className="relative z-10 mt-auto pt-2">
                <div className="flex justify-between items-end">
                  <div className="flex flex-col space-y-1">
                    <div className="flex items-center space-x-3 text-tertiary/80 font-mono text-sm tracking-widest mb-2">
                      <span>••••</span>
                      <span>••••</span>
                      <span>••••</span>
                      <span className="text-primary/90">4029</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[9px] uppercase text-tertiary tracking-widest font-bold mb-0.5">
                        Account Holder
                      </span>
                      <span className="text-sm font-medium text-primary tracking-widest uppercase truncate max-w-[180px]">
                        {user?.displayName || "MY WALLET"}
                      </span>
                    </div>
                  </div>

                  <div
                    className={`px-3 py-1.5 rounded-full flex items-center space-x-1.5 backdrop-blur-md border border-white/5 shadow-sm
                         ${trendDirection === "down" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-rose-500/10 text-rose-600 dark:text-rose-400"}`}
                  >
                    {trendDirection === "down" ? (
                      <TrendingDownOutline
                        color="currentColor"
                        height="14px"
                        width="14px"
                      />
                    ) : (
                      <TrendingUpOutline
                        color="currentColor"
                        height="14px"
                        width="14px"
                      />
                    )}
                    <span className="text-xs font-bold">
                      {percentageChange}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Decorative Background Elements */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-[40px] pointer-events-none"></div>
              <div className="absolute bottom-[-20%] left-[-10%] w-40 h-40 bg-gradient-to-tr from-blue-500/10 to-transparent rounded-full blur-[50px] pointer-events-none"></div>
            </div>

            {/* BACK FACE */}
            <div
              className="absolute inset-0 liquid-card overflow-hidden rounded-[1.5rem] p-6 flex flex-col justify-between hover:scale-[1.01] transition-all duration-500 group bg-gradient-to-bl from-blue-100/60 via-transparent to-accent/20 dark:from-blue-800/40 dark:via-transparent dark:to-accent/15"
              style={{
                backfaceVisibility: "hidden",
                transform: "rotateY(180deg)",
              }}
            >
              {/* Noise Texture Overlay */}
              <div
                className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none z-0 mix-blend-overlay"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='1'/%3E%3C/svg%3E")`,
                }}
              ></div>
              {/* Header Text */}
              <div className="flex justify-between items-start z-10 w-full mb-1">
                <div>
                  <div className="text-xs text-tertiary/80 leading-relaxed mb-1">
                    <span
                      className={`font-bold text-sm ${trendDirection === "down" ? "text-emerald-500" : "text-rose-500"}`}
                    >
                      {formatCurrency(diff)}
                    </span>{" "}
                    {trendDirection === "down" ? "lower" : "higher"} than last
                    month
                  </div>
                  <p className="text-[10px] text-tertiary/50 leading-tight">
                    By this time last month ({format(lastMonthDate, "MMMM do")}
                    ), you had spent{" "}
                    <span className="font-medium text-tertiary/70">
                      {formatCurrency(lastMonthPartialSum)}
                    </span>
                  </p>
                </div>
              </div>

              {/* Graph Wrapper */}
              <div className="w-full flex-1 min-h-0 flex items-end justify-center pb-4">
                <div className="w-full">
                  <TrajectoryChart
                    currentMonthData={thisMonthGraphData || []}
                    lastMonthData={lastMonthGraphData || []}
                    trendDirection={trendDirection}
                  />
                </div>
              </div>
            </div>
          </motion.div>
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
    </div>
  );
};

export default Home;
