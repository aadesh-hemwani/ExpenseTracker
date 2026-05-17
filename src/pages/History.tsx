import { useState, useMemo, memo, lazy, Suspense, useRef, useCallback, useEffect } from "react";
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
  parseISO,
} from "date-fns";
import "../components/ui/LiquidGlass.css";
import { LiquidBack } from "../components/ui/LiquidBack";
import { AnimatePresence, motion } from "framer-motion";
import Card from "../components/Card";
import { useMonthlyStats, useExpenses, useExpensesForMonth } from "../hooks/useExpenses";
import { useEvents } from "../hooks/useEvents";
import ExpenseListModal from "../components/ExpenseListModal";
import { ExpenseCard } from "../components/ExpenseCard";
import { CATEGORIES, getCategoryIcon } from "../utils/uiUtils";
import { formatCurrency } from "../utils/formatUtils";
import { Expense } from "../types";
import MonthInsights from "../components/MonthInsights";
const DeepMonthAnalysis = lazy(() => import("../components/DeepMonthAnalysis"));
import ExpenseHeatmap from "../components/ExpenseHeatmap";
import { useTheme } from "../context/ThemeContext";
import { Download, Calendar, Search, X, SlidersHorizontal } from "lucide-react";
import { generateMonthlyReport } from "../utils/reportGenerator";
import { useAuth } from "../context/AuthContext";
import IOSSpinner from "../components/ui/IOSSpinner";
import { ExpenseCardSkeleton, ChartSkeleton } from "../components/ui/Skeleton";
import { Timestamp } from "firebase/firestore";
import { useGlobalModal } from "../context/GlobalModalContext";
import { useLocation } from "react-router-dom";

const CategoryDonutChart = lazy(() => import("../components/CategoryDonutChart"));

/**
 * Renders an amount with small decimals if present.
 */
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

interface MonthCardProps {
  monthKey: string;
  total: number;
  onClick: (date: Date) => void;
}

const MonthCard = memo(({ monthKey, total, onClick }: MonthCardProps) => {
  const date = useMemo(() => parseISO(monthKey + "-01"), [monthKey]);

  return (
    <Card
      onClick={() => onClick(date)}
      className="text-left flex flex-col justify-between h-28 group"
    >
      <div className="flex justify-between items-start w-full">
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em] group-hover:text-accent transition-colors">
          {format(date, "MMMM")}
        </span>
        {isSameMonth(date, new Date()) && (
          <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
        )}
      </div>
      <div>
        <span className="text-xl font-bold text-gray-900 dark:text-white block">
          {renderAmount(total)}
        </span>
        <span className="text-[10px] text-gray-400 font-medium">
          {format(date, "yyyy")}
        </span>
      </div>
    </Card>
  );
});

MonthCard.displayName = "MonthCard";

interface MemoizedExpenseListProps {
  label: string;
  expenses: Expense[];
  onDelete: (id: string, amount: number, date: Timestamp | Date) => void;
  onView: (expense: Expense) => void;
  onEdit: (expense: Expense) => void;
  readOnly: boolean;
}

const MemoizedExpenseList = memo(({ label, expenses, onDelete, onView, onEdit, readOnly }: MemoizedExpenseListProps) => {
  return (
    <div className="space-y-2">
      <h4 className="sticky top-[calc(env(safe-area-inset-top)+4.9rem)] z-20 pt-0 pb-2 -mx-5 px-5 liquid-sticky-header flex items-center justify-between transition-all">
        {label}
      </h4>
      <div className="space-y-2">
        {expenses.map((expense) => (
          <ExpenseCard
            key={expense.id}
            expense={expense}
            onClick={onView}
            onDelete={onDelete}
            onEdit={onEdit}
            readOnly={readOnly}
          />
        ))}
      </div>
    </div>
  );
});

MemoizedExpenseList.displayName = "MemoizedExpenseList";

export interface FilterState {
  query: string;
  type: "all" | "regular" | "one-off" | "event";
  contextId?: string;
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

const CalendarView = memo(({
  currentMonth,
  onBack,
  onSelectDate,
  selectedDate,
  expenses = [],
  readOnly = false,
  isLoading = false,
  filters,
  setFilters,
}: CalendarViewProps) => {
  const [searchQuery, setSearchQuery] = useState("");

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters(prev => ({ ...prev, query: searchQuery }));
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, setFilters]);

  const location = useLocation();
  const { deleteExpense } = useExpenses();
  const { openModal } = useGlobalModal();
  const { user } = useAuth();
  const { events } = useEvents();
  const { theme } = useTheme();

  const [viewMode, setViewMode] = useState<"standard" | "analysis">(
    (location.state as any)?.viewMode === "analysis" ? "analysis" : "standard"
  );
  const [showFilters, setShowFilters] = useState(false);
  const [tempFilters, setTempFilters] = useState<FilterState>(filters);

  const openFilters = useCallback(() => {
    setTempFilters(filters);
    setShowFilters(true);
  }, [filters]);

  const applyFilters = useCallback(() => {
    setFilters(tempFilters);
    setShowFilters(false);
  }, [tempFilters, setFilters]);

  const filteredExpenses = useMemo(() => {
    let result = expenses.filter(e => {
      if (filters.type !== "all") {
        const effectiveContext = e.context || "personal";
        const effectiveContextId = e.contextId || (e.type === "One-off" ? "one-off" : "regular");

        if (filters.type === "regular") {
          if (effectiveContext !== "personal" || effectiveContextId !== "regular") return false;
        } else if (filters.type === "one-off") {
          if (effectiveContext !== "personal" || effectiveContextId !== "one-off") return false;
        } else if (filters.type === "event") {
          if (effectiveContext !== "event") return false;
          if (filters.contextId && effectiveContextId !== filters.contextId) return false;
        }
      }

      if (filters.query.trim()) {
        const query = filters.query.toLowerCase().trim();
        const noteMatch = (e.note || "").toLowerCase().includes(query);
        const categoryMatch = (e.category || "").toLowerCase().includes(query);
        if (!noteMatch && !categoryMatch) return false;
      }

      if (filters.category !== "all" && e.category !== filters.category) return false;
      if (filters.minAmount !== "" && Number(e.amount) < Number(filters.minAmount)) return false;
      if (filters.maxAmount !== "" && Number(e.amount) > Number(filters.maxAmount)) return false;

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

    result.sort((a, b) => {
      if (filters.sortBy.startsWith("amount")) {
        const aAmt = Number(a.amount);
        const bAmt = Number(b.amount);
        return filters.sortBy === "amount-desc" ? bAmt - aAmt : aAmt - bAmt;
      } else {
        const aDate = a.date instanceof Timestamp ? a.date.toMillis() : new Date(a.date).getTime();
        const bDate = b.date instanceof Timestamp ? b.date.toMillis() : new Date(b.date).getTime();
        return filters.sortBy === "date-desc" ? bDate - aDate : aDate - bDate;
      }
    });

    return result;
  }, [expenses, filters]);


  const groupedExpenses = useMemo(() => {
    const groups: Record<string, Expense[]> = {};
    const todayStr = format(new Date(), "yyyy-MM-dd");
    const yesterdayStr = format(new Date(Date.now() - 86400000), "yyyy-MM-dd");

    filteredExpenses.forEach((expense) => {
      const date = expense.date instanceof Timestamp ? expense.date.toDate() : new Date(expense.date);
      const dateStr = format(date, "yyyy-MM-dd");
      let dateLabel = format(date, "MMM dd");

      if (dateStr === todayStr) dateLabel = "Today";
      else if (dateStr === yesterdayStr) dateLabel = "Yesterday";

      if (!groups[dateLabel]) groups[dateLabel] = [];
      groups[dateLabel].push(expense);
    });

    return Object.entries(groups);
  }, [filteredExpenses]);

  const chartContainerRef = useRef<HTMLDivElement>(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  const handleDownloadPDF = useCallback(async () => {
    setIsGeneratingPDF(true);
    try {
      let chartImage = undefined;
      if (chartContainerRef.current) {
        await new Promise((resolve) => setTimeout(resolve, 500));
        const { default: html2canvas } = await import("html2canvas");
        const canvas = await html2canvas(chartContainerRef.current, {
          scale: 2,
          backgroundColor: "#ffffff",
          onclone: (clonedDoc) => {
            const legend = clonedDoc.querySelector(".recharts-legend-wrapper");
            if (legend) (legend as HTMLElement).style.display = "none";

            const chartCard = clonedDoc.querySelector(".bg-surface") ||
              clonedDoc.querySelector(".bg-black") ||
              clonedDoc.querySelector("[class*='bg-black']");
            if (chartCard) {
              const card = chartCard as HTMLElement;
              card.style.backgroundColor = "#ffffff";
              card.style.color = "#000000";
              card.style.border = "none";
              card.style.boxShadow = "none";
            }

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
  }, [filteredExpenses, user?.displayName, user?.email, currentMonth]);

  const eventPills = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    return events.filter(ev => {
      const start = ev.startDate instanceof Timestamp ? ev.startDate.toDate() : new Date(ev.startDate);
      const end = ev.endDate instanceof Timestamp ? ev.endDate.toDate() : new Date(ev.endDate);
      return start <= monthEnd && end >= monthStart;
    });
  }, [events, currentMonth]);

  return (
    <div className="h-full flex flex-col">
      <div className="sticky top-0 z-30 pt-[calc(env(safe-area-inset-top)+1rem)] md:pt-4 pb-4 -mx-5 px-5 md:mx-0 md:px-0 liquid-sticky-header flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <LiquidBack onClick={onBack} />
          <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
            {format(currentMonth, "MMMM yyyy")}
          </h2>
        </div>

        <button
          onClick={handleDownloadPDF}
          disabled={isGeneratingPDF || isLoading}
          className="w-12 h-12 flex items-center justify-center rounded-full bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-900 dark:text-gray-100 transition-all disabled:opacity-50 active:scale-95 shadow-sm"
          title="Download Statement"
        >
          {isGeneratingPDF ? <IOSSpinner size={20} /> : <Download size={24} color="currentColor" />}
        </button>
      </div>

      <div className="flex flex-col gap-3 mb-6">
        <div className="flex gap-2">
          <div className="relative w-full">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={18} className="text-gray-400" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search notes or categories..."
              className="w-full pl-10 pr-10 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-accent transition-all text-gray-900 dark:text-white"
            />
            {filters.query && (
              <button
                onClick={() => setSearchQuery("")}
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

        {typeof document !== 'undefined' && createPortal((
          <AnimatePresence>
            {showFilters && (
              <div className="fixed top-0 left-0 right-0 z-[100] flex justify-center items-end sm:items-center p-0 sm:p-4 pointer-events-none" style={{ height: "100lvh" }}>
                <motion.div
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  onClick={() => setShowFilters(false)}
                  className="absolute inset-0 bg-black/40 backdrop-blur-sm pointer-events-auto"
                />
                <motion.div
                  initial={{ y: "100%", opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: "100%", opacity: 0 }}
                  transition={{ type: "spring", damping: 25, stiffness: 300 }}
                  className="w-full sm:max-w-md bg-white dark:bg-[#121316] rounded-t-[20px] sm:rounded-[20px] shadow-lg relative z-10 pointer-events-auto flex flex-col max-h-[90vh]"
                >
                  <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between shrink-0">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">Filters</h3>
                    <button onClick={() => setShowFilters(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 dark:bg-white/10 text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors">
                      <X size={18} />
                    </button>
                  </div>

                  <div className="px-6 py-6 overflow-y-auto space-y-8">
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

                    <div>
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 block">Sort By</label>
                      <div className="grid grid-cols-2 gap-3">
                        {([
                          { id: "date-desc", label: "Newest First" },
                          { id: "date-asc", label: "Oldest First" },
                          { id: "amount-desc", label: "Highest Amount" },
                          { id: "amount-asc", label: "Lowest Amount" },
                        ] as const).map(option => (
                          <button
                            key={option.id}
                            onClick={() => setTempFilters(prev => ({ ...prev, sortBy: option.id }))}
                            className={`p-3 rounded-xl text-sm font-semibold transition-all border ${tempFilters.sortBy === option.id ? 'bg-accent/10 border-accent text-accent' : 'bg-transparent border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-700'}`}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 block">Amount Range</label>
                      <div className="flex items-center gap-4">
                        <div className="relative w-full">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">₹</span>
                          <input
                            type="number" placeholder="Min" value={tempFilters.minAmount}
                            onChange={(e) => setTempFilters(prev => ({ ...prev, minAmount: e.target.value }))}
                            className="w-full pl-8 pr-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-gray-800 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-accent transition-all text-gray-900 dark:text-white"
                          />
                        </div>
                        <span className="text-gray-400 font-bold">to</span>
                        <div className="relative w-full">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">₹</span>
                          <input
                            type="number" placeholder="Max" value={tempFilters.maxAmount}
                            onChange={(e) => setTempFilters(prev => ({ ...prev, maxAmount: e.target.value }))}
                            className="w-full pl-8 pr-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-gray-800 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-accent transition-all text-gray-900 dark:text-white"
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 block">Date Range</label>
                      <div className="flex items-center gap-4">
                        <input
                          type="date" value={tempFilters.startDate}
                          min={format(startOfMonth(currentMonth), "yyyy-MM-dd")}
                          max={format(endOfMonth(currentMonth), "yyyy-MM-dd")}
                          onChange={(e) => setTempFilters(prev => ({ ...prev, startDate: e.target.value }))}
                          className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-gray-800 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-accent transition-all text-gray-900 dark:text-white dark:[color-scheme:dark]"
                        />
                        <span className="text-gray-400 font-bold">to</span>
                        <input
                          type="date" value={tempFilters.endDate}
                          min={format(startOfMonth(currentMonth), "yyyy-MM-dd")}
                          max={format(endOfMonth(currentMonth), "yyyy-MM-dd")}
                          onChange={(e) => setTempFilters(prev => ({ ...prev, endDate: e.target.value }))}
                          className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-gray-800 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-accent transition-all text-gray-900 dark:text-white dark:[color-scheme:dark]"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="p-6 pt-2 pb-8 sm:pb-6 flex items-center justify-between shrink-0 border-t border-gray-100 dark:border-gray-800/60 mt-2">
                    <button
                      onClick={() => setTempFilters({ ...filters, type: 'all', category: 'all', minAmount: '', maxAmount: '', startDate: '', endDate: '', sortBy: 'date-desc' })}
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

        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2 overflow-x-auto no-scrollbar pb-1">
            {([
              { id: "all", label: "All" },
              { id: "regular", label: "Regular" },
              { id: "one-off", label: "One-off" },
            ] as const).map(f => (
              <button
                key={f.id}
                onClick={() => setFilters(prev => ({ ...prev, type: f.id, contextId: undefined }))}
                className={`px-4 py-2 rounded-full text-sm font-semibold transition-all whitespace-nowrap ${filters.type === f.id && !filters.contextId
                  ? "bg-black text-white dark:bg-white dark:text-black"
                  : "bg-gray-100 text-gray-600 dark:bg-white/5 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/10"
                  }`}
              >
                {f.label}
              </button>
            ))}
            {eventPills.map(ev => (
              <button
                key={ev.id}
                onClick={() => setFilters(prev => ({ ...prev, type: "event", contextId: ev.id }))}
                className={`px-4 py-2 rounded-full text-sm font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 ${filters.type === "event" && filters.contextId === ev.id
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
          <ExpenseHeatmap
            expenses={filteredExpenses}
            currentMonth={currentMonth}
            onSelectDate={onSelectDate}
            selectedDate={selectedDate}
          />

          <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-800">
            <div ref={chartContainerRef} className="mb-8 min-h-[250px] flex items-center justify-center">
              <Suspense fallback={<ChartSkeleton />}>
                <CategoryDonutChart expenses={filteredExpenses} animate={!isGeneratingPDF} />
              </Suspense>
            </div>

            <MonthInsights expenses={filteredExpenses} currentMonth={currentMonth} />

            {(!filters.query && filters.category === "all" && !filters.minAmount && !filters.maxAmount && !filters.startDate && !filters.endDate) && (
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                {filters.type === "all" ? "All" : filters.type === "one-off" ? "One-off" : "Regular"} Expenses in {format(currentMonth, "MMMM")}
              </h3>
            )}

            {(filters.query || filters.category !== "all" || filters.minAmount || filters.maxAmount || filters.startDate || filters.endDate) && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 font-medium">
                Found {filteredExpenses.length} result{filteredExpenses.length !== 1 ? 's' : ''}
              </p>
            )}

            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map(i => <ExpenseCardSkeleton key={i} />)}
              </div>
            ) : filteredExpenses.length === 0 ? (
              <div className="text-center py-10 text-gray-500 dark:text-gray-400">
                {(filters.query || filters.category !== "all" || filters.minAmount || filters.maxAmount || filters.startDate || filters.endDate) ? "No matching results found." : "No expenses yet."}
              </div>
            ) : (
              <div className="space-y-4">
                {filters.sortBy.startsWith("amount") ? (
                  <MemoizedExpenseList
                    label={filters.sortBy === "amount-desc" ? "Highest to Lowest Amount" : "Lowest to Highest Amount"}
                    expenses={filteredExpenses}
                    onDelete={deleteExpense}
                    onView={(expense) => openModal("view", expense)}
                    onEdit={(expense) => openModal("edit", expense)}
                    readOnly={readOnly}
                  />
                ) : (
                  <div className="flex flex-col space-y-6">
                    {groupedExpenses.map(([label, groupExpenses], index) => (
                      <div key={label} className={`space-y-2 ${index > 0 ? "pt-6" : ""}`}>
                        <MemoizedExpenseList
                          label={label}
                          expenses={groupExpenses}
                          onDelete={deleteExpense}
                          onView={(expense) => openModal("view", expense)}
                          onEdit={(expense) => openModal("edit", expense)}
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
});

CalendarView.displayName = "CalendarView";

interface HistoryProps {
  userId?: string;
  readOnly?: boolean;
}

const History = memo(({ userId, readOnly = false }: HistoryProps) => {
  const location = useLocation();
  const { stats, loading: statsLoading } = useMonthlyStats(userId);

  const [view, setView] = useState<"list" | "calendar">(() =>
    (location.state as any)?.viewMode === "analysis" ? "calendar" : "list"
  );
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
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

  const handleCloseModal = useCallback(() => {
    setSelectedDate(null);
  }, []);

  const { expenses: monthExpenses, loading: monthLoading } =
    useExpensesForMonth(
      view === "calendar" ? currentMonth : null,
      stats,
      !statsLoading,
      true,
      userId,
    );

  const { yearlyTotals } = useMemo(() => {
    const sortedStats = [...stats].sort((a, b) => b.monthKey.localeCompare(a.monthKey));
    const yearly: Record<string, { year: string; total: number; months: any[] }> = {};

    sortedStats.forEach((stat) => {
      const year = stat.monthKey.substring(0, 4);
      if (!yearly[year]) yearly[year] = { year, total: 0, months: [] };
      yearly[year].total += stat.total;
      yearly[year].months.push(stat);
    });

    return {
      yearlyTotals: Object.values(yearly).sort((a, b) => b.year.localeCompare(a.year))
    };
  }, [stats]);

  const calendarDays = useMemo(() => {
    if (view !== "calendar") return [];
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    return eachDayOfInterval({
      start: startOfWeek(monthStart),
      end: endOfWeek(monthEnd)
    });
  }, [currentMonth, view]);

  const openMonthCalendar = useCallback((date: Date) => {
    setCurrentMonth(date);
    setView("calendar");
  }, []);

  const backToGrid = useCallback(() => {
    setView("list");
    setSelectedDate(null);
  }, []);

  const getDate = useCallback((date: Timestamp | Date | any): Date => {
    if (date instanceof Timestamp) return date.toDate();
    if (date instanceof Date) return date;
    if (date && typeof date.toDate === "function") return date.toDate();
    return new Date(date);
  }, []);

  const filteredModalExpenses = useMemo(() => {
    if (!selectedDate) return [];
    return monthExpenses.filter((e) => {
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

      return isSameDay(getDate(e.date), selectedDate);
    });
  }, [monthExpenses, selectedDate, filters, getDate]);

  return (
    <div className="pt-4 h-full flex flex-col pb-20 md:pb-0">
      {view === "list" && (
        <div className="space-y-6 pt-[calc(env(safe-area-inset-top)+2rem)]">
          <div className="flex justify-between items-center">
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white">History</h1>
          </div>

          {stats.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
              <Calendar color="currentColor" size={48} className="mb-4 opacity-20" />
              <p>No history yet.</p>
            </div>
          ) : (
            <div className="space-y-8">
              {yearlyTotals.map(({ year, total, months }) => (
                <div key={year} className="space-y-4">
                  <div className="flex justify-between items-end border-b border-gray-100 dark:border-gray-800 pb-2">
                    <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">{year}</h2>
                    <div className="text-right">
                      <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest block mb-1">Total</span>
                      <span className="text-lg font-bold text-gray-900 dark:text-white">{renderAmount(total)}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {months.map(({ monthKey, total }: any) => (
                      <MonthCard key={monthKey} monthKey={monthKey} total={total} onClick={openMonthCalendar} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

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

      <AnimatePresence>
        {selectedDate && (
          <ExpenseListModal
            title={format(selectedDate, "EEEE, MMM do")}
            expenses={filteredModalExpenses}
            onClose={handleCloseModal}
          />
        )}
      </AnimatePresence>
    </div>
  );
});

History.displayName = "History";

export default History;
