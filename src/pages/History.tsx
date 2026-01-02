import { useState, useMemo, memo } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  parseISO,
} from "date-fns";
import { ArrowLeft, Calendar as CalendarIcon } from "lucide-react";
import { AnimatePresence } from "framer-motion";
import Card from "../components/Card";
import {
  useMonthlyStats,
  useExpenses,
  useExpensesForMonth,
} from "../hooks/useExpenses";
import ExpenseListModal from "../components/ExpenseListModal";
import SwipeableExpenseItem from "../components/SwipeableExpenseItem";
import { getCategoryIcon } from "../utils/uiUtils";
import { Expense } from "../types";

interface MonthCardProps {
  monthKey: string;
  total: number;
  onClick: (date: Date) => void;
}

// --- Sub-Component: Month Card ---
const MonthCard = memo(({ monthKey, total, onClick }: MonthCardProps) => {
  const date = parseISO(monthKey + "-01"); // Convert "2023-11" to Date object

  return (
    <Card
      as="button"
      onClick={() => onClick(date)}
      className="text-left flex flex-col justify-between h-32 group"
    >
      <div className="flex justify-between items-start w-full">
        <span className="text-sm font-bold text-gray-400 uppercase tracking-wider group-hover:text-accent transition-colors">
          {format(date, "MMMM")}
        </span>
        {isSameMonth(date, new Date()) && (
          <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
        )}
      </div>
      <div>
        <span className="text-2xl font-bold text-gray-900 dark:text-white block">
          ₹{total.toLocaleString("en-IN")}
        </span>
        <span className="text-xs text-gray-400 font-medium">
          {format(date, "yyyy")}
        </span>
      </div>
    </Card>
  );
});

// --- Sub-Component: Calendar View ---
interface CalendarViewProps {
  currentMonth: Date;
  onBack: () => void;
  onSelectDate: (date: Date) => void;
  selectedDate: Date | null;
  expenses: Expense[];
  calendarDays: Date[];
  readOnly?: boolean;
}

const CalendarView = memo(
  ({
    currentMonth,
    onBack,
    onSelectDate,
    selectedDate,
    expenses = [],
    calendarDays,
    readOnly = false,
  }: CalendarViewProps) => {
    // Expenses are now passed down!
    const { deleteExpense } = useExpenses();

    // Optimized: Create a map of daily totals to avoid repeated filtering
    const dailyTotalsMap = useMemo(() => {
      const map: Record<string, number> = {};
      expenses.forEach((e) => {
        // @ts-ignore
        if (!e.date) return;
        // @ts-ignore
        const dateVal = e.date.toDate ? e.date.toDate() : e.date;
        const dayKey = format(dateVal, "yyyy-MM-dd");
        map[dayKey] = (map[dayKey] || 0) + Number(e.amount);
      });
      return map;
    }, [expenses]);

    const getDailyTotal = (date: Date) => {
      const key = format(date, "yyyy-MM-dd");
      return dailyTotalsMap[key] || 0;
    };

    return (
      <div className="space-y-4 animate-in slide-in-from-right-10 duration-200 pb-20">
        {/* Header with Back Button */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={onBack}
            className="p-2 bg-white dark:bg-black border border-gray-200 dark:border-gray-800 rounded-full hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {format(currentMonth, "MMMM yyyy")}
          </h2>
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1 md:gap-2">
          {["S", "M", "T", "W", "T", "F", "S"].map((day, i) => (
            <div
              key={i}
              className="text-center text-xs font-semibold text-gray-300 py-2"
            >
              {day}
            </div>
          ))}

          {calendarDays.map((day, idx) => {
            const dailyTotal = getDailyTotal(day);
            const roundedTotal = Math.ceil(dailyTotal);
            const hasSpend = roundedTotal > 0;
            const isSelected = selectedDate && isSameDay(day, selectedDate);
            const isCurrentMonth = isSameMonth(day, currentMonth);

            let amountColor = "text-green-500";
            if (roundedTotal > 2000) amountColor = "text-red-500";
            else if (roundedTotal >= 1000) amountColor = "text-yellow-500";

            return (
              <button
                key={idx}
                onClick={() => onSelectDate(day)}
                disabled={!isCurrentMonth}
                className={`
                    relative h-14 md:h-24 rounded-xl flex flex-col items-center justify-start pt-2 transition-all border
                    ${!isCurrentMonth ? "opacity-30" : "opacity-100"}
                    ${
                      isSelected
                        ? "bg-black dark:bg-white text-white dark:text-black ring-4 ring-gray-100 dark:ring-gray-800 scale-105 z-10"
                        : "bg-white dark:bg-black text-gray-900 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900 border-transparent"
                    }
                    ${
                      isToday(day) && !isSelected
                        ? "text-accent font-bold bg-accent/10"
                        : ""
                    }
                  `}
              >
                <span className="text-sm">{format(day, "d")}</span>

                {hasSpend && (
                  <>
                    {/* Desktop Amount */}
                    <span
                      className={`block md:text-[10px] text-[8px] mt-1 font-medium ${
                        isSelected
                          ? "text-gray-300 dark:text-gray-600"
                          : amountColor
                      }`}
                    >
                      ₹{roundedTotal}
                    </span>
                  </>
                )}
              </button>
            );
          })}
        </div>

        {/* Monthly Expenses List */}
        <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-800">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            All Expenses in {format(currentMonth, "MMMM")}
          </h3>
          <div className="space-y-4">
            {expenses.length > 0 ? (
              expenses.map((expense) => (
                <SwipeableExpenseItem
                  key={expense.id}
                  t={expense}
                  getCategoryIcon={getCategoryIcon}
                  onDelete={deleteExpense}
                  readOnly={readOnly}
                  // Use default wrapper style for list consistency
                />
              ))
            ) : (
              <p className="text-center text-gray-400 text-sm py-4">
                No expenses recorded for this month.
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }
);

interface HistoryProps {
  userId?: string;
  readOnly?: boolean;
}

// --- Main Component ---
const History = ({ userId, readOnly = false }: HistoryProps) => {
  // Use Optimized Hook: Fetches only tiny stats docs
  const { stats, loading: statsLoading } = useMonthlyStats(userId);

  const [view, setView] = useState<"list" | "calendar">("list"); // 'list' | 'calendar'
  const [currentMonth, setCurrentMonth] = useState(new Date()); // The month being viewed in calendar
  const [selectedDate, setSelectedDate] = useState<Date | null>(null); // The specific day clicked in calendar

  const handleCloseModal = () => {
    setSelectedDate(null);
  };

  // 3. Get Specific Month Expenses (On Demand) - Now uses Cache with Stats Validation
  const { expenses: monthExpenses } = useExpensesForMonth(
    view === "calendar" ? currentMonth : null,
    stats,
    !statsLoading,
    true,
    userId
  );

  // 1. Group Data for the "Month Grid" View
  const monthGroups = useMemo(() => {
    // We can use the 'stats' directly now!
    // stats array: [{ monthKey: '2023-11', total: 500, count: 2 }, ...]

    // Sort by date descending (newest months first)
    return stats.sort((a, b) => b.monthKey.localeCompare(a.monthKey));
  }, [stats]);

  // 2. Calendar Logic Helpers
  const calendarDays = useMemo(() => {
    if (view !== "calendar") return [];
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);
    return eachDayOfInterval({ start: startDate, end: endDate });
  }, [currentMonth, view]);

  // --- Handlers ---
  function openMonthCalendar(date: Date) {
    setCurrentMonth(date);
    setView("calendar");
  }

  function backToGrid() {
    setView("list");
    setSelectedDate(null);
  }

  const getDate = (date: any): Date => {
    if (date && typeof date.toDate === "function") return date.toDate();
    if (date instanceof Date) return date;
    return new Date(date);
  };

  return (
    <div className="animate-fade-in pt-4 h-full flex flex-col pb-20 md:pb-0">
      {/* VIEW 1: MONTH GRID OVERVIEW */}
      {view === "list" && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white">
              History
            </h1>
          </div>

          {monthGroups.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
              <CalendarIcon className="w-12 h-12 mb-4 opacity-20" />
              <p>No history yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {monthGroups.map(({ monthKey, total }: any) => (
                <MonthCard
                  key={monthKey}
                  monthKey={monthKey}
                  total={total}
                  onClick={openMonthCalendar}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: SPECIFIC MONTH CALENDAR */}
      {view === "calendar" && (
        <CalendarView
          currentMonth={currentMonth}
          onBack={backToGrid}
          onSelectDate={setSelectedDate}
          selectedDate={selectedDate}
          expenses={monthExpenses}
          calendarDays={calendarDays}
          readOnly={readOnly}
        />
      )}

      {/* Day Detail Modal (Calendar View) */}
      <AnimatePresence>
        {selectedDate && (
          <ExpenseListModal
            title={format(selectedDate, "EEEE, MMM do")}
            expenses={monthExpenses.filter((e) =>
              isSameDay(getDate(e.date), selectedDate)
            )}
            onClose={handleCloseModal}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default History;
