import React, { useState, useMemo } from 'react';
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
  parseISO
} from 'date-fns';
import { ChevronLeft, ArrowLeft, Calendar as CalendarIcon } from 'lucide-react';
import Card from '../components/Card';
import { useMonthlyStats, useExpenses } from '../hooks/useExpenses';
import DayDetailModal from '../components/DayDetailModal';

// --- Sub-Component: Month Card ---
const MonthCard = ({ monthKey, total, onClick }) => {
  const date = parseISO(monthKey + "-01"); // Convert "2023-11" to Date object

  return (
    <Card
      as="button"
      onClick={() => onClick(date)}
      className="p-5 rounded-2xl shadow-sm hover:shadow-md hover:border-accent/20 text-left flex flex-col justify-between h-32 group"
    >
      <div className="flex justify-between items-start w-full">
        <span className="text-sm font-bold text-gray-400 uppercase tracking-wider group-hover:text-accent transition-colors">
          {format(date, 'MMMM')}
        </span>
        {isSameMonth(date, new Date()) && (
          <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
        )}
      </div>
      <div>
        <span className="text-2xl font-bold text-gray-900 dark:text-white block">
          ₹{total.toLocaleString('en-IN')}
        </span>
        <span className="text-xs text-gray-400 font-medium">
          {format(date, 'yyyy')}
        </span>
      </div>
    </Card>
  );
};

// --- Main Component ---
const History = () => {
  // Use Optimized Hook: Fetches only tiny stats docs
  const { stats, loading } = useMonthlyStats();

  const [view, setView] = useState('list'); // 'list' | 'calendar'
  const [currentMonth, setCurrentMonth] = useState(new Date()); // The month being viewed in calendar
  const [selectedDate, setSelectedDate] = useState(null); // The specific day clicked in calendar
  const [isClosing, setIsClosing] = useState(false);

  // Helper to handle closing animation
  const handleCloseModal = () => {
    setIsClosing(true);
    setTimeout(() => {
      setSelectedDate(null);
      setIsClosing(false);
    }, 500); // Duration matches animation
  };

  // 1. Group Data for the "Month Grid" View
  const monthGroups = useMemo(() => {
    // We can use the 'stats' directly now!
    // stats array: [{ monthKey: '2023-11', total: 500, count: 2 }, ...]

    // Sort by date descending (newest months first)
    return stats.sort((a, b) => b.monthKey.localeCompare(a.monthKey));
  }, [stats]);

  // 2. Calendar Logic Helpers
  const generateCalendarDays = (monthDate) => {
    const monthStart = startOfMonth(monthDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);
    return eachDayOfInterval({ start: startDate, end: endDate });
  };

  // Note: We don't have daily totals for the calendar grid view readily available without fetching expenses for that month.
  // We can fetch them when we enter the calendar view for a specific month.
  // For now, let's keep the "dots" simple or we need `useExpensesForMonth` at this level if we want to show daily totals in the calendar grid cells.
  // Decision: To show per-day totals in the calendar grid, we DO need the expenses for that month.
  // So when `view === 'calendar'`, we should fetch expenses for `currentMonth`.

  // Let's create a sub-component for the Calendar View to encapsulate that data fetching!

  return (
    <div className="animate-fade-in pt-4 h-full flex flex-col pb-20 md:pb-0">

      {/* VIEW 1: MONTH GRID OVERVIEW */}
      {view === 'list' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white">History</h1>
          </div>

          {monthGroups.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
              <CalendarIcon className="w-12 h-12 mb-4 opacity-20" />
              <p>No history yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {monthGroups.map(({ monthKey, total }) => (
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
      {view === 'calendar' && (
        <CalendarView
          currentMonth={currentMonth}
          onBack={backToGrid}
          onSelectDate={setSelectedDate}
          selectedDate={selectedDate}
        />
      )}

      {/* MODAL: The Day Detail View */}
      {selectedDate && (
        <DayDetailModal
          selectedDate={selectedDate}
          onClose={handleCloseModal}
          isClosing={isClosing}
        />
      )}
    </div>
  );

  // --- Handlers ---
  function openMonthCalendar(date) {
    setCurrentMonth(date);
    setView('calendar');
  }

  function backToGrid() {
    setView('list');
    setSelectedDate(null);
  }
};

// --- Sub-Component: Calendar View (Fetches its own data for the month) ---
// We move this here to use the `useExpensesForMonth` hook cleanly
import { useExpensesForMonth } from '../hooks/useExpenses';
import SwipeableExpenseItem from '../components/SwipeableExpenseItem';
import { Apple, ShoppingCart, Car, PartyPopper, IndianRupee } from 'lucide-react';

const CalendarView = ({ currentMonth, onBack, onSelectDate, selectedDate }) => {
  // Fetch expenses for this month to populate the calendar grid dots/totals
  const { expenses } = useExpensesForMonth(currentMonth);
  const { deleteExpense } = useExpenses();

  // Helper to calc daily totals from the fetched month expenses
  const getDailyTotal = (date) => {
    return expenses
      .filter(e => isSameDay(e.date, date))
      .reduce((acc, curr) => acc + Number(curr.amount), 0);
  };

  const generateCalendarDays = (monthDate) => {
    const monthStart = startOfMonth(monthDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);
    return eachDayOfInterval({ start: startDate, end: endDate });
  };

  const getCategoryIcon = (cat) => {
    switch (cat) {
      case 'Food': return <Apple className="w-5 h-5 text-gray-700 dark:text-gray-200" />;
      case 'Shopping': return <ShoppingCart className="w-5 h-5 text-gray-700 dark:text-gray-200" />;
      case 'Transport': return <Car className="w-5 h-5 text-gray-700 dark:text-gray-200" />;
      case 'Entertainment': return <PartyPopper className="w-5 h-5 text-gray-700 dark:text-gray-200" />;
      default: return <IndianRupee className="w-5 h-5 text-gray-700 dark:text-gray-200" />;
    }
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
          {format(currentMonth, 'MMMM yyyy')}
        </h2>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1 md:gap-2">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(day => (
          <div key={day} className="text-center text-xs font-semibold text-gray-300 py-2">
            {day}
          </div>
        ))}

        {generateCalendarDays(currentMonth).map((day, idx) => {
          const dailyTotal = getDailyTotal(day);
          const hasSpend = dailyTotal > 0;
          const isSelected = selectedDate && isSameDay(day, selectedDate);
          const isCurrentMonth = isSameMonth(day, currentMonth);

          return (
            <button
              key={idx}
              onClick={() => onSelectDate(day)}
              disabled={!isCurrentMonth}
              className={`
                    relative h-14 md:h-24 rounded-xl flex flex-col items-center justify-start pt-2 transition-all border
                    ${!isCurrentMonth ? 'opacity-30' : 'opacity-100'}
                    ${isSelected ? 'bg-black dark:bg-white text-white dark:text-black ring-4 ring-gray-100 dark:ring-gray-800 scale-105 z-10' : 'bg-white dark:bg-black text-gray-900 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900 border-transparent'}
                    ${isToday(day) && !isSelected ? 'text-accent font-bold bg-accent/10' : ''}
                  `}
            >
              <span className="text-sm">{format(day, 'd')}</span>

              {hasSpend && (
                <>
                  {/* Mobile Dot */}
                  <div className={`mt-1 w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white dark:bg-black' : 'bg-accent'} md:hidden`} />
                  {/* Desktop Amount */}
                  <span className={`hidden md:block text-[10px] mt-1 font-medium ${isSelected ? 'text-gray-300 dark:text-gray-600' : 'text-gray-500 dark:text-gray-400'}`}>
                    ₹{dailyTotal}
                  </span>
                </>
              )}
            </button>
          );
        })}
      </div>

      {/* Monthly Expenses List */}
      <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-800">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">All Expenses in {format(currentMonth, 'MMMM')}</h3>
        <div className="space-y-4">
          {expenses.length > 0 ? (
            expenses.map(expense => (
              <SwipeableExpenseItem
                key={expense.id}
                t={expense}
                getCategoryIcon={getCategoryIcon}
                onDelete={deleteExpense}
              // Use default wrapper style for list consistency
              />
            ))
          ) : (
            <p className="text-center text-gray-400 text-sm py-4">No expenses recorded for this month.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default History;