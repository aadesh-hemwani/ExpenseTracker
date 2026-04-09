import { useState, useMemo, memo, lazy, Suspense } from "react";
import { createPortal } from "react-dom";
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
import "../components/ui/LiquidGlass.css";
import { LiquidBack } from "../components/ui/LiquidBack";
import { AnimatePresence, motion } from "framer-motion";
import Card from "../components/Card";
import { useMonthlyStats, useExpenses, useExpensesForMonth } from "../hooks/useExpenses";
import { useEvents } from "../hooks/useEvents";
import ExpenseListModal from "../components/ExpenseListModal";
import SwipeableExpenseItem from "../components/SwipeableExpenseItem";
import { CATEGORIES, getCategoryIcon } from "../utils/uiUtils";
import { formatCurrency } from "../utils/formatUtils";
import { Expense } from "../types";
const CategoryDonutChart = lazy(() => import("../components/CategoryDonutChart"));
import MonthInsights from "../components/MonthInsights";
import DeepMonthAnalysis from "../components/DeepMonthAnalysis";
import { useTheme } from "../context/ThemeContext";
import { Download, Calendar, Search, X, SlidersHorizontal } from "lucide-react";
// import html2canvas from "html2canvas";
import { generateMonthlyReport } from "../utils/reportGenerator";
import { useRef } from "react";
import { useAuth } from "../context/AuthContext";
import IOSSpinner from "../components/ui/IOSSpinner";
import { Timestamp } from "firebase/firestore";
import { useGlobalModal } from "../context/GlobalModalContext";

interface MonthCardProps {
  monthKey: string;
  total: number;
  onClick: (date: Date) => void;
}

const renderAmount = (amount: number) => {
    const formatted = formatCurrency(amount);
    const [main, decimal] = formatted.split(".");
    if (decimal && decimal !== "00") {
        return (
            <>
                {main}
                <span className="text-[0.8em] opacity-50 font-medium">.{decimal}</span>
            </>
        );
    }
    return main;
};

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
          {renderAmount(total)}
        </span>
        <span className="text-xs text-gray-400 font-medium">
          {format(date, "yyyy")}
        </span>
      </div>
    </Card>
  );
});

// --- Sub-Component: Memoized Expense List ---
interface MemoizedExpenseListProps {
  label: string;
  expenses: Expense[];
  onDelete: (id: string, amount: number, date: Date | Timestamp) => void;
  onView: (expense: Expense) => void;
  readOnly: boolean;
}

const MemoizedExpenseList = memo(
  ({ label, expenses, onDelete, onView, readOnly }: MemoizedExpenseListProps) => {
    return (
      <div className="space-y-2">
        <h4 className="sticky top-[calc(env(safe-area-inset-top)+4.9rem)] z-20 pt-0 pb-2 -mx-5 px-5 liquid-sticky-header flex items-center justify-between transition-all">
          {label}
        </h4>
        <div className="space-y-2">
          {expenses.map((expense) => (
            <SwipeableExpenseItem
              key={expense.id}
              t={expense}
              getCategoryIcon={getCategoryIcon}
              onDelete={onDelete}
              readOnly={readOnly}
              hideDate={true}
              onClick={(expense) => onView(expense)}
            />
          ))}
        </div>
      </div>
    );
  }
);

export interface FilterState {
  query: string;
  type: "all" | "regular" | "one-off" | "event";
  contextId?: string;  // When type === 'event', the specific eventId
  category: string;
  minAmount: string;
  maxAmount: string;
  startDate: string;
  endDate: string;
  sortBy: "date-desc" | "date-asc" | "amount-desc" | "amount-asc";
}

interface CalendarViewProps {
  currentMonth: Date;
  onBack: () => void;
  onSelectDate: (date: Date) => void;
  selectedDate: Date | null;
  expenses: Expense[];
  calendarDays: Date[];
  readOnly?: boolean;
  isLoading?: boolean;
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
}

const CalendarView = ({
  currentMonth,
  onBack,
  onSelectDate,
  selectedDate,
  expenses = [],
  calendarDays,
  readOnly = false,
  isLoading = false,
  filters,
  setFilters,
}: CalendarViewProps) => {
  const { deleteExpense } = useExpenses();
  const { openModal } = useGlobalModal();
  const { user } = useAuth();
  const { events } = useEvents();
  const [viewMode, setViewMode] = useState<"standard" | "analysis">("standard");
  const [showFilters, setShowFilters] = useState(false);
  const [tempFilters, setTempFilters] = useState<FilterState>(filters);
  const { theme } = useTheme();

  const openFilters = () => {
    setTempFilters(filters);
    setShowFilters(true);
  };

  const applyFilters = () => {
    setFilters(tempFilters);
    setShowFilters(false);
  };

  const filteredExpenses = useMemo(() => {
    let result = expenses.filter(e => {
      // 1. Context / Type Filter
      if (filters.type !== "all") {
        // Resolve the effective contextId for this expense (backward compat)
        const effectiveContext = e.context || "personal";
        const effectiveContextId = e.contextId ||
          (e.type === "One-off" ? "one-off" : "regular");

        if (filters.type === "regular") {
          if (effectiveContext !== "personal" || effectiveContextId !== "regular") return false;
        } else if (filters.type === "one-off") {
          if (effectiveContext !== "personal" || effectiveContextId !== "one-off") return false;
        } else if (filters.type === "event") {
          if (effectiveContext !== "event") return false;
          if (filters.contextId && effectiveContextId !== filters.contextId) return false;
        }
      }

      // 2. Search Filter
      if (filters.query.trim()) {
        const query = filters.query.toLowerCase().trim();
        const noteMatch = (e.note || "").toLowerCase().includes(query);
        const categoryMatch = (e.category || "").toLowerCase().includes(query);
        if (!noteMatch && !categoryMatch) return false;
      }

      // 3. Category Filter
      if (filters.category !== "all" && e.category !== filters.category) return false;

      // 4. Amount Range
      if (filters.minAmount !== "" && Number(e.amount) < Number(filters.minAmount)) return false;
      if (filters.maxAmount !== "" && Number(e.amount) > Number(filters.maxAmount)) return false;

      // 5. Date Range
      const eDate = e.date instanceof Timestamp ? e.date.toDate() : new Date(e.date);
      if (filters.startDate !== "") {
        const sDate = parseISO(filters.startDate);
        if (eDate < sDate) return false;
      }
      if (filters.endDate !== "") {
        const eDateFilter = parseISO(filters.endDate);
        eDateFilter.setHours(23, 59, 59, 999);
        if (eDate > eDateFilter) return false;
      }

      return true;
    });

    // 6. Sorting
    result.sort((a, b) => {
      if (filters.sortBy.startsWith("amount")) {
        const aAmt = Number(a.amount);
        const bAmt = Number(b.amount);
        return filters.sortBy === "amount-desc" ? bAmt - aAmt : aAmt - bAmt;
      } else {
        const aDate = a.date instanceof Timestamp ? a.date.toDate().getTime() : new Date(a.date).getTime();
        const bDate = b.date instanceof Timestamp ? b.date.toDate().getTime() : new Date(b.date).getTime();
        return filters.sortBy === "date-desc" ? bDate - aDate : aDate - bDate;
      }
    });

    return result;
  }, [expenses, filters]);

  // Optimized: Create a map of daily totals to avoid repeated filtering
  const dailyTotalsMap = useMemo(() => {
    const map: Record<string, number> = {};
    filteredExpenses.forEach((e) => {
      // @ts-ignore
      if (!e.date) return;
      // @ts-ignore
      const dateVal = e.date.toDate ? e.date.toDate() : e.date;
      const dayKey = format(dateVal, "yyyy-MM-dd");
      map[dayKey] = (map[dayKey] || 0) + Number(e.amount);
    });
    return map;
  }, [filteredExpenses]);

  const groupedExpenses = useMemo(() => {
    return Object.entries(
      filteredExpenses.reduce((acc, expense) => {
        const date =
          expense.date instanceof Timestamp
            ? expense.date.toDate()
            : new Date(expense.date);

        let dateLabel = format(date, "MMM dd");
        const todayStr = format(new Date(), "yyyy-MM-dd");
        const yesterdayStr = format(new Date(Date.now() - 86400000), "yyyy-MM-dd");
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
  }, [filteredExpenses]);

  // PDF Export Logic
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  const handleDownloadPDF = async () => {
    setIsGeneratingPDF(true);
    try {
      // Capture Chart if available
      let chartImage = undefined;
      if (chartContainerRef.current) {
        // Wait for chart to re-render without animation
        await new Promise((resolve) => setTimeout(resolve, 500));

        // Wait for chart to render fully if needed
        const { default: html2canvas } = await import("html2canvas");
        const canvas = await html2canvas(chartContainerRef.current, {
          scale: 2, // Higher resolution
          backgroundColor: "#ffffff", // Force white background
          onclone: (clonedDoc) => {
            // 1. Hide the Recharts Legend in the capture (we draw a native one)
            const legend = clonedDoc.querySelector(".recharts-legend-wrapper");
            if (legend) {
              (legend as HTMLElement).style.display = "none";
            }

            // 2. Force White Background & Black Text on the Card
            // Use a more specific selector or the captured element itself if possible.
            // Since we are capturing chartContainerRef, we can target the wrapper div or its children.

            const chartCard =
              clonedDoc.querySelector(".bg-surface") ||
              clonedDoc.querySelector(".bg-black") ||
              clonedDoc.querySelector("[class*='bg-black']");
            if (chartCard) {
              const card = chartCard as HTMLElement;
              card.style.backgroundColor = "#ffffff";
              card.style.color = "#000000";
              card.style.border = "none"; // Remove border if any
              card.style.boxShadow = "none";
            }

            // 3. Center the Title
            const title = clonedDoc.querySelector("h3");
            if (title) {
              title.style.color = "#000000";
              title.style.textAlign = "center";
              title.style.width = "100%";
            }
          },
        });
        chartImage = canvas.toDataURL("image/png");
      }

      await generateMonthlyReport(
        filteredExpenses,
        {
          userName: user?.displayName || "User",
          email: user?.email || undefined,
          generatedDate: new Date(),
          period: format(currentMonth, "MMMM yyyy"),
        },
        chartImage,
      );
    } catch (error) {
      console.error("PDF Generation failed", error);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const getDailyTotal = (date: Date) => {
    const key = format(date, "yyyy-MM-dd");
    return dailyTotalsMap[key] || 0;
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-30 pt-[calc(env(safe-area-inset-top)+1rem)] md:pt-4 pb-4 -mx-5 px-5 md:mx-0 md:px-0 liquid-sticky-header flex items-center justify-between mb-6 transition-all">
        <div className="flex items-center gap-3">
          <LiquidBack onClick={onBack} />
          <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
            {format(currentMonth, "MMMM yyyy")}
          </h2>
        </div>

        {/* PDF Export Button */}
        <button
          onClick={handleDownloadPDF}
          disabled={isGeneratingPDF || isLoading}
          className="w-12 h-12 flex items-center justify-center rounded-full bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-900 dark:text-gray-100 transition-all disabled:opacity-50 active:scale-95 shadow-sm"
          title="Download Statement"
        >
          {isGeneratingPDF ? (
            <IOSSpinner size={20} />
          ) : (
            <Download
              size={24}
              color="currentColor"
            />
          )}
        </button>
      </div>

      {/* Search and Filter Section */}
      <div className="flex flex-col gap-3 mb-6">
        {/* Search Bar & Filter Toggle */}
        <div className="flex gap-2">
          <div className="relative w-full">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={18} className="text-gray-400" />
            </div>
            <input
              type="text"
              value={filters.query}
              onChange={(e) => setFilters(prev => ({ ...prev, query: e.target.value }))}
              placeholder="Search notes or categories..."
              className="w-full pl-10 pr-10 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-accent transition-all text-gray-900 dark:text-white"
            />
            {filters.query && (
              <button
                onClick={() => setFilters(prev => ({ ...prev, query: "" }))}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <X size={18} />
              </button>
            )}
          </div>
          <button
            onClick={openFilters}
            className={`w-12 h-12 shrink-0 flex items-center justify-center rounded-xl transition-all ${showFilters ? 'bg-accent/10 text-accent border border-accent/20' : 'bg-gray-50 dark:bg-white/5 text-gray-400 border border-gray-200 dark:border-white/10 hover:text-gray-600 dark:hover:text-gray-200'}`}
          >
            <SlidersHorizontal size={18} />
          </button>
        </div>

        {/* Filter Bottom Sheet Modal */}
        {typeof document !== 'undefined' && createPortal((
          <AnimatePresence>
            {showFilters && (
              <div className="fixed inset-0 z-[100] flex justify-center items-end sm:items-center p-0 sm:p-4 pointer-events-none">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  onClick={() => setShowFilters(false)}
                  className="absolute inset-0 bg-black/40 backdrop-blur-sm pointer-events-auto"
                />
                <motion.div
                  initial={{ y: "100%", opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: "100%", opacity: 0 }}
                  transition={{ type: "spring", damping: 25, stiffness: 300 }}
                  className="w-full sm:max-w-md bg-white dark:bg-[#121212] rounded-t-3xl sm:rounded-3xl shadow-2xl relative z-10 pointer-events-auto flex flex-col max-h-[90vh]"
                >
                  {/* Header */}
                  <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between shrink-0">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">Filters</h3>
                    <button onClick={() => setShowFilters(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 dark:bg-white/10 text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors">
                      <X size={18} />
                    </button>
                  </div>

                  {/* Scrollable Content */}
                  <div className="px-6 py-6 overflow-y-auto space-y-8">
                    {/* Category Selection (Horizontal scrolling pills) */}
                    <div>
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 block">Category</label>
                      <div className="flex space-x-2 overflow-x-auto no-scrollbar pb-2 -mx-6 px-6">
                        <button
                          onClick={() => setTempFilters(prev => ({ ...prev, category: 'all' }))}
                          className={`px-4 py-2 shrink-0 rounded-full text-sm font-semibold transition-all ${tempFilters.category === 'all' ? 'bg-black dark:bg-white text-white dark:text-black shadow-md' : 'bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-300 hover:bg-gray-200'}`}
                        >
                          All Categories
                        </button>
                        {CATEGORIES.map(cat => (
                          <button
                            key={cat}
                            onClick={() => setTempFilters(prev => ({ ...prev, category: cat }))}
                            className={`px-4 py-2 shrink-0 flex items-center gap-2 rounded-full text-sm font-semibold transition-all ${tempFilters.category === cat ? 'bg-black dark:bg-white text-white dark:text-black shadow-md' : 'bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-300 hover:bg-gray-200'}`}
                          >
                            <span className="scale-[0.8]">{getCategoryIcon(cat, "20px")}</span> {cat}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Sort Order */}
                    <div>
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 block">Sort By</label>
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          { id: "date-desc", label: "Newest First" },
                          { id: "date-asc", label: "Oldest First" },
                          { id: "amount-desc", label: "Highest Amount" },
                          { id: "amount-asc", label: "Lowest Amount" },
                        ].map(option => (
                          <button
                            key={option.id}
                            onClick={() => setTempFilters(prev => ({ ...prev, sortBy: option.id as any }))}
                            className={`p-3 rounded-xl text-sm font-semibold transition-all border ${tempFilters.sortBy === option.id ? 'bg-accent/10 border-accent text-accent' : 'bg-transparent border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-700'}`}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Amount Range */}
                    <div>
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 block">Amount Range</label>
                      <div className="flex items-center gap-4">
                        <div className="relative w-full">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">₹</span>
                          <input
                            type="number"
                            placeholder="Min"
                            value={tempFilters.minAmount}
                            onChange={(e) => setTempFilters(prev => ({ ...prev, minAmount: e.target.value }))}
                            className="w-full pl-8 pr-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-gray-800 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-accent transition-all text-gray-900 dark:text-white"
                          />
                        </div>
                        <span className="text-gray-400 font-bold">to</span>
                        <div className="relative w-full">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">₹</span>
                          <input
                            type="number"
                            placeholder="Max"
                            value={tempFilters.maxAmount}
                            onChange={(e) => setTempFilters(prev => ({ ...prev, maxAmount: e.target.value }))}
                            className="w-full pl-8 pr-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-gray-800 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-accent transition-all text-gray-900 dark:text-white"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Date Range */}
                    <div>
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 block">Date Range</label>
                      <div className="flex items-center gap-4">
                        <input
                          type="date"
                          value={tempFilters.startDate}
                          min={format(startOfMonth(currentMonth), "yyyy-MM-dd")}
                          max={format(endOfMonth(currentMonth), "yyyy-MM-dd")}
                          onChange={(e) => setTempFilters(prev => ({ ...prev, startDate: e.target.value }))}
                          className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-gray-800 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-accent transition-all text-gray-900 dark:text-white dark:[color-scheme:dark]"
                        />
                        <span className="text-gray-400 font-bold">to</span>
                        <input
                          type="date"
                          value={tempFilters.endDate}
                          min={format(startOfMonth(currentMonth), "yyyy-MM-dd")}
                          max={format(endOfMonth(currentMonth), "yyyy-MM-dd")}
                          onChange={(e) => setTempFilters(prev => ({ ...prev, endDate: e.target.value }))}
                          className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-gray-800 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-accent transition-all text-gray-900 dark:text-white dark:[color-scheme:dark]"
                        />
                      </div>
                    </div>

                  </div>

                  {/* Footer Actions */}
                  <div className="p-6 pt-2 pb-8 sm:pb-6 flex items-center justify-between shrink-0 border-t border-gray-100 dark:border-gray-800/60 mt-2">
                    <button
                      onClick={() => setTempFilters({ query: tempFilters.query, type: 'all', category: 'all', minAmount: '', maxAmount: '', startDate: '', endDate: '', sortBy: 'date-desc' })}
                      className="px-4 py-3 text-sm font-bold text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
                    >
                      Reset
                    </button>
                    <button
                      onClick={applyFilters}
                      className="px-8 py-3 bg-accent text-white rounded-xl text-sm font-bold shadow-lg shadow-accent/30 active:scale-95 transition-all outline-none"
                    >
                      Apply Filters
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        ), document.body)}

        {/* Expense Type/Context Filter & Analysis Toggle */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2 overflow-x-auto no-scrollbar pb-1">
            {/* Static pills: All, Regular, One-off */}
            {([
              { id: "all", label: "All" },
              { id: "regular", label: "Regular" },
              { id: "one-off", label: "One-off" },
            ] as const).map(f => (
              <button
                key={f.id}
                onClick={() => setFilters(prev => ({ ...prev, type: f.id, contextId: undefined }))}
                className={`px-4 py-2 rounded-full text-sm font-semibold transition-all whitespace-nowrap ${
                  filters.type === f.id && !filters.contextId
                    ? "bg-black text-white dark:bg-white dark:text-black"
                    : "bg-gray-100 text-gray-600 dark:bg-white/5 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/10"
                }`}
              >
                {f.label}
              </button>
            ))}
            {/* Dynamic event pills */}
            {events.filter(ev => {
              const start = ev.startDate instanceof Timestamp ? ev.startDate.toDate() : new Date(ev.startDate);
              const end = ev.endDate instanceof Timestamp ? ev.endDate.toDate() : new Date(ev.endDate);
              const monthStart = startOfMonth(currentMonth);
              const monthEnd = endOfMonth(currentMonth);
              return start <= monthEnd && end >= monthStart;
            }).map(ev => (
              <button
                key={ev.id}
                onClick={() => setFilters(prev => ({ ...prev, type: "event", contextId: ev.id }))}
                className={`px-4 py-2 rounded-full text-sm font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                  filters.type === "event" && filters.contextId === ev.id
                    ? "bg-purple-600 text-white"
                    : "bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-500/20"
                }`}
              >
                🎉 {ev.name}
              </button>
            ))}
          </div>

          <button
            onClick={() => setViewMode(viewMode === "standard" ? "analysis" : "standard")}
            className={`shrink-0 ml-4 px-4 py-2 rounded-full text-sm font-bold flex items-center gap-1.5 transition-all ${viewMode === "analysis"
              ? "bg-accent text-white shadow-lg"
              : "bg-accent/10 text-accent hover:bg-accent/20"
              }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18" /><path d="m19 9-5 5-4-4-3 3" /></svg>
            {viewMode === "analysis" ? "View Grid" : "Deep Dive"}
          </button>
        </div>
      </div>

      {viewMode === "analysis" ? (
        <div className="mt-4">
          <DeepMonthAnalysis expenses={filteredExpenses} currentMonth={currentMonth} theme={theme} />
        </div>
      ) : (
        <>
          {/* Charts Section with Ref: REMOVED as per user request to avoid duplicate. 
                Ref moved to the bottom chart. */}

          {/* Legend/Info (Optional, if Chart component doesn't show it) */}

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
                    ${isSelected
                      ? "bg-black dark:bg-white text-white dark:text-black ring-4 ring-gray-100 dark:ring-gray-800 scale-105 z-10"
                      : "bg-white dark:bg-black text-gray-900 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900 border-transparent"
                    }
                    ${isToday(day) && !isSelected
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
                        className={`block md:text-[10px] text-[8px] mt-1 font-medium ${isSelected
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
            <div ref={chartContainerRef} className="mb-8 min-h-[250px] flex items-center justify-center">
              <Suspense fallback={<IOSSpinner size={32} />}>
                <CategoryDonutChart expenses={filteredExpenses} animate={!isGeneratingPDF} />
              </Suspense>
            </div>

            {/* Analytics Widgets */}
            <MonthInsights expenses={filteredExpenses} currentMonth={currentMonth} />

            {/* Only show "Expenses in..." if no particular filters are active to reduce clutter */}
            {(!filters.query && filters.category === "all" && !filters.minAmount && !filters.maxAmount && !filters.startDate && !filters.endDate) && (
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                {filters.type === "all" ? "All" : filters.type === "one-off" ? "One-off" : "Regular"} Expenses in {format(currentMonth, "MMMM")}
              </h3>
            )}

            {/* Filter Results Summary */}
            {(filters.query || filters.category !== "all" || filters.minAmount || filters.maxAmount || filters.startDate || filters.endDate) && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 font-medium">
                Found {filteredExpenses.length} result{filteredExpenses.length !== 1 ? 's' : ''}
              </p>
            )}

            {filteredExpenses.length === 0 ? (
              <div className="text-center py-10 text-gray-500 dark:text-gray-400">
                {(filters.query || filters.category !== "all" || filters.minAmount || filters.maxAmount || filters.startDate || filters.endDate) ? "No matching results found." : "No expenses yet."}
              </div>
            ) : (
              <div className="space-y-4">
                {filters.sortBy.startsWith("amount") ? (
                  // Flat list if sorting by amount to avoid confusing day groupings
                  <MemoizedExpenseList
                    label={filters.sortBy === "amount-desc" ? "Highest to Lowest Amount" : "Lowest to Highest Amount"}
                    expenses={filteredExpenses}
                    onDelete={deleteExpense}
                    onView={(expense) => openModal("view", expense)}
                    readOnly={readOnly}
                  />
                ) : (
                  // Normal day-by-day grouped list
                  <div className="flex flex-col space-y-6">
                    {groupedExpenses.map(([label, groupExpenses], index) => (
                      <div
                        key={label}
                        className={`space-y-2 ${index > 0 ? "pt-6" : ""}`}
                      >
                        <MemoizedExpenseList
                          label={label}
                          expenses={groupExpenses}
                          onDelete={deleteExpense}
                          onView={(expense) => openModal("view", expense)}
                          readOnly={readOnly}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

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
  const [filters, setFilters] = useState<FilterState>({
    query: "",
    type: "all",
    category: "all",
    minAmount: "",
    maxAmount: "",
    startDate: "",
    endDate: "",
    sortBy: "date-desc",
  });

  const handleCloseModal = () => {
    setSelectedDate(null);
  };

  // 3. Get Specific Month Expenses (On Demand) - Now uses Cache with Stats Validation
  const { expenses: monthExpenses, loading: monthLoading } =
    useExpensesForMonth(
      view === "calendar" ? currentMonth : null,
      stats,
      !statsLoading,
      true,
      userId,
    );

  // 1. Group Data for the "Month Grid" View
  const { monthGroups, yearlyTotals } = useMemo(() => {
    // Sort by date descending (newest months first)
    const sortedStats = [...stats].sort((a, b) => b.monthKey.localeCompare(a.monthKey));

    const yearly: Record<string, number> = {};
    const groupedByYear: Record<string, typeof sortedStats> = {};

    sortedStats.forEach((stat) => {
      const year = stat.monthKey.substring(0, 4);
      if (!yearly[year]) yearly[year] = 0;
      if (!groupedByYear[year]) groupedByYear[year] = [];

      yearly[year] += stat.total;
      groupedByYear[year].push(stat);
    });

    return {
      monthGroups: sortedStats,
      yearlyTotals: Object.entries(yearly).map(([year, total]) => ({
        year,
        total,
        months: groupedByYear[year],
      })).sort((a, b) => b.year.localeCompare(a.year))
    };
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
              <Calendar
                color="currentColor"
                size={48}
                className="mb-4 opacity-20"
              />
              <p>No history yet.</p>
            </div>
          ) : (
            <div className="space-y-8">
              {yearlyTotals.map(({ year, total, months }) => (
                <div key={year} className="space-y-4">
                  <div className="flex justify-between items-end border-b border-gray-100 dark:border-gray-800 pb-2">
                    <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                      {year}
                    </h2>
                    <div className="text-right">
                      <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest block mb-1">Total</span>
                      <span className="text-lg font-bold text-gray-900 dark:text-white">{renderAmount(total)}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {months.map(({ monthKey, total }: any) => (
                      <MonthCard
                        key={monthKey}
                        monthKey={monthKey}
                        total={total}
                        onClick={openMonthCalendar}
                      />
                    ))}
                  </div>
                </div>
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
          isLoading={monthLoading}
          filters={filters}
          setFilters={setFilters}
        />
      )}

      {/* Day Detail Modal (Calendar View) */}
      <AnimatePresence>
        {selectedDate && (
          <ExpenseListModal
            title={format(selectedDate, "EEEE, MMM do")}
            expenses={monthExpenses.filter((e) => {
              if (filters.type === "one-off" && e.type !== "One-off") return false;
              if (filters.type === "regular" && e.type === "One-off") return false;

              if (filters.query.trim()) {
                const query = filters.query.toLowerCase().trim();
                const noteMatch = (e.note || "").toLowerCase().includes(query);
                const categoryMatch = (e.category || "").toLowerCase().includes(query);
                if (!noteMatch && !categoryMatch) return false;
              }

              if (filters.category !== "all" && e.category !== filters.category) return false;
              if (filters.minAmount !== "" && Number(e.amount) < Number(filters.minAmount)) return false;
              if (filters.maxAmount !== "" && Number(e.amount) > Number(filters.maxAmount)) return false;

              // Modal list strictly overrides date filters implicitly since it's a day view
              return isSameDay(getDate(e.date), selectedDate);
            })}
            onClose={handleCloseModal}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default History;
