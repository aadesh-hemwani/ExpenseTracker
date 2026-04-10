import React, { useMemo } from "react";
import { format, isToday, startOfMonth, endOfMonth, eachDayOfInterval } from "date-fns";
import { motion } from "framer-motion";
import { Expense } from "../types";
import CountUp from "./CountUp";

interface DistributionStats {
  p50: number;
  p80: number;
  p95: number;
  average: number;
  median: number;
  max: number;
  total: number;
}

interface ExpenseHeatmapProps {
  expenses: Expense[];
  currentMonth: Date;
  onSelectDate: (date: Date) => void;
  selectedDate: Date | null;
}

/**
 * Calculates percentiles and averages for daily spending.
 */
const calculateDistributionStats = (dailyTotals: number[]): DistributionStats => {
  const sortedTotals = [...dailyTotals].filter(v => v > 0).sort((a, b) => a - b);
  const n = sortedTotals.length;

  if (n === 0) {
    return { p50: 0, p80: 0, p95: 0, average: 0, median: 0, max: 0, total: 0 };
  }

  const getPercentile = (p: number) => {
    const idx = Math.min(Math.floor((p / 100) * n), n - 1);
    return sortedTotals[idx];
  };

  const sum = dailyTotals.reduce((a, b) => a + b, 0);
  const average = sum / dailyTotals.length;
  const median = getPercentile(50);
  const p80 = getPercentile(80);
  const p95 = getPercentile(95);
  const max = Math.max(...dailyTotals);

  return { p50: median, p80, p95, average, median, max, total: sum };
};

/**
 * Interpolates between two HSL colors.
 */
const interpolateColor = (val: number, start: number[], end: number[]) => {
  const h = start[0] + (end[0] - start[0]) * val;
  const s = start[1] + (end[1] - start[1]) * val;
  const l = start[2] + (end[2] - start[2]) * val;
  const a = start[3] + (end[3] - start[3]) * val;
  return `hsla(${h}, ${s}%, ${l}%, ${a})`;
};

/**
 * Maps a value to a color intensity based on distribution stats.
 */
const getColor = (value: number, stats: DistributionStats) => {
  if (value <= 0) return "transparent";

  // Define HSL colors: [h, s, l, a]
  const GREEN = [142, 70, 45, 0.15];  // Low - subtle green
  const AMBER = [45, 93, 47, 0.3];   // Mid - amber
  const RED = [0, 84, 60, 0.45];     // High - orange/red

  // Cap value at P95 to prevent outliers from skewing the scale
  const cappedValue = Math.min(value, stats.p95);

  if (cappedValue <= stats.p50) {
    // 0 to P50: -> Green
    const t = cappedValue / (stats.p50 || 1);
    return interpolateColor(t, [142, 70, 45, 0.05], GREEN);
  } else if (cappedValue <= stats.p80) {
    // P50 to P80: Green -> Amber
    const t = (cappedValue - stats.p50) / (stats.p80 - stats.p50 || 1);
    return interpolateColor(t, GREEN, AMBER);
  } else {
    // P80 to P95: Amber -> Red
    const t = (cappedValue - stats.p80) / (stats.p95 - stats.p80 || 1);
    return interpolateColor(t, AMBER, RED);
  }
};

const ExpenseHeatmap: React.FC<ExpenseHeatmapProps> = ({
  expenses,
  currentMonth,
  onSelectDate,
  selectedDate,
}) => {
  const { calendarDays, startPadding } = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    const days = eachDayOfInterval({ start, end });
    const padding = start.getDay(); // 0 for Sunday, 1 for Monday, etc.
    return { calendarDays: days, startPadding: padding };
  }, [currentMonth]);

  const dailyTotalsMap = useMemo(() => {
    const map: Record<string, number> = {};
    expenses.forEach((e) => {
      // @ts-ignore
      if (!e.date) return;
      // @ts-ignore
      const dateVal = e.date.toDate ? e.date.toDate() : e.date;
      const dayKey = format(new Date(dateVal), "yyyy-MM-dd");
      map[dayKey] = (map[dayKey] || 0) + Number(e.amount);
    });
    return map;
  }, [expenses]);

  const stats = useMemo(() => {
    const totals = calendarDays.map(day => dailyTotalsMap[format(day, "yyyy-MM-dd")] || 0);
    return calculateDistributionStats(totals);
  }, [calendarDays, dailyTotalsMap]);

  const isFuture = (date: Date) => {
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    return date > today;
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-7 gap-1.5 md:gap-2">
        {["S", "M", "T", "W", "T", "F", "S"].map((day, i) => (
          <div
            key={i}
            className="text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest py-2"
          >
            {day}
          </div>
        ))}

        {/* Start Padding */}
        {Array.from({ length: startPadding }).map((_, i) => (
          <div key={`pad-${i}`} className="h-14 md:h-20" />
        ))}

        {calendarDays.map((day, idx) => {
          const dayKey = format(day, "yyyy-MM-dd");
          const total = dailyTotalsMap[dayKey] || 0;
          const isSelected = selectedDate && format(day, "yyyy-MM-dd") === format(selectedDate, "yyyy-MM-dd");
          const future = isFuture(day);
          const cellColor = getColor(total, stats);
          const hasData = total > 0;

          return (
            <motion.button
              key={idx}
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: future ? 0.3 : 1 }}
              transition={{ delay: idx * 0.01, duration: 0.2 }}
              onClick={() => onSelectDate(day)}
              className={`
                relative h-14 md:h-20 rounded-xl flex flex-col items-center justify-center transition-all border
                ${isSelected
                  ? "bg-black dark:bg-white text-white dark:text-black shadow-lg ring-2 ring-accent/30 z-10"
                  : "bg-surface text-gray-900 dark:text-gray-300 border-transparent hover:border-subtle"
                }
                ${isToday(day) && !isSelected ? "ring-1 ring-accent/50" : ""}
              `}
              style={{
                backgroundColor: !isSelected && hasData ? cellColor : undefined,
              }}
            >
              <span className={`text-sm font-semibold ${isSelected ? "" : "text-primary/80"}`}>
                {format(day, "d")}
              </span>

              {hasData && (
                <span className={`text-[10px] sm:text-[11px] font-bold mt-1 ${isSelected ? "opacity-90" : "text-primary/60"}`}>
                  ₹{Math.round(total).toLocaleString('en-IN')}
                </span>
              )}

              {isToday(day) && (
                <div className="absolute top-1.5 right-1.5 w-1 h-1 rounded-full bg-accent" />
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Stats Footer */}
      <div className="flex items-center justify-between px-2 pt-2 border-t border-subtle/30">
        <div className="flex gap-6">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-tertiary uppercase tracking-wider">Avg Daily</span>
            <span className="text-sm font-bold text-primary">
              <CountUp value={stats.average} duration={1} />
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-tertiary uppercase tracking-wider">Median</span>
            <span className="text-sm font-bold text-primary">
              <CountUp value={stats.median} duration={1} />
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-tertiary uppercase tracking-wider">Total</span>
            <span className="text-sm font-bold text-primary">
              <CountUp value={stats.total} duration={1} />
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-emerald-500/30" />
            <span className="text-[10px] font-bold text-tertiary uppercase">Low</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-amber-500/50" />
            <span className="text-[10px] font-bold text-tertiary uppercase">Mid</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-rose-500/70" />
            <span className="text-[10px] font-bold text-tertiary uppercase">High</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExpenseHeatmap;
