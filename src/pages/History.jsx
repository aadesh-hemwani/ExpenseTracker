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
import { ChevronLeft, ArrowLeft, X, Calendar as CalendarIcon } from 'lucide-react';
import { useExpenses } from '../hooks/useExpenses';

// --- Sub-Component: Month Card ---
const MonthCard = ({ monthKey, total, onClick }) => {
  const date = parseISO(monthKey + "-01"); // Convert "2023-11" to Date object

  return (
    <button
      onClick={() => onClick(date)}
      className="bg-white dark:bg-black p-5 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md hover:border-accent/20 transition-all text-left flex flex-col justify-between h-32 group"
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
    </button>
  );
};

// --- Main Component ---
const History = () => {
  const { expenses } = useExpenses();
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
    const groups = {};
    expenses.forEach(exp => {
      // Create a key like "2023-12" to group by month
      const key = format(exp.date, 'yyyy-MM');
      if (!groups[key]) groups[key] = 0;
      groups[key] += Number(exp.amount);
    });

    // Sort by date descending (newest months first)
    return Object.entries(groups)
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([key, total]) => ({ key, total }));
  }, [expenses]);

  // 2. Calendar Logic Helpers
  const generateCalendarDays = (monthDate) => {
    const monthStart = startOfMonth(monthDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);
    return eachDayOfInterval({ start: startDate, end: endDate });
  };

  const getExpensesForDay = (date) => {
    return expenses.filter(e => isSameDay(e.date, date));
  };

  const getDailyTotal = (date) => {
    return getExpensesForDay(date).reduce((acc, curr) => acc + Number(curr.amount), 0);
  };

  // 3. Handlers
  const openMonthCalendar = (date) => {
    setCurrentMonth(date);
    setView('calendar');
  };

  const backToGrid = () => {
    setView('list');
    setSelectedDate(null);
  };

  // --- RENDER ---
  return (
    <div className="animate-fade-in pt-4 h-full flex flex-col pb-20 md:pb-0">

      {/* VIEW 1: MONTH GRID OVERVIEW */}
      {view === 'list' && (
        <div className="space-y-6">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">History.</h1>

          {monthGroups.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
              <CalendarIcon className="w-12 h-12 mb-4 opacity-20" />
              <p>No history yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {monthGroups.map(({ key, total }) => (
                <MonthCard
                  key={key}
                  monthKey={key}
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
        <div className="space-y-4 animate-in slide-in-from-right-10 duration-200">

          {/* Header with Back Button */}
          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={backToGrid}
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
                  onClick={() => setSelectedDate(day)}
                  disabled={!isCurrentMonth} // Optional: Disable days not in this month
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
        </div>
      )}

      {/* MODAL FIX: The Day Detail View */}
      {selectedDate && (
        <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center">
          {/* 1. Backdrop (Click to close) */}
          <div
            className={`absolute inset-0 bg-gray-900/30 backdrop-blur-sm transition-opacity ${isClosing ? 'animate-fade-out' : 'animate-fade-in'}`}
            onClick={handleCloseModal}
          />

          {/* 2. Content Card */}
          <div className={`relative z-10 bg-white dark:bg-black w-[95%] max-w-md rounded-3xl md:rounded-3xl p-6 shadow-2xl border border-gray-200 dark:border-gray-800 max-h-[70vh] flex flex-col mb-3 md:mb-0 ${isClosing ? 'animate-slide-down' : 'animate-slide-up'}`}>

            {/* Modal Header */}
            <div className="flex justify-between items-center mb-6 shrink-0">
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  {format(selectedDate, 'EEEE, MMM do')}
                </h3>
                <p className="text-sm text-gray-500 font-medium mt-1">
                  Daily Total: <span className="text-gray-900 dark:text-white font-bold">₹{getDailyTotal(selectedDate)}</span>
                </p>
              </div>
              <button
                onClick={handleCloseModal}
                className="p-2 bg-gray-100 dark:bg-gray-900 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
              >
                <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>
            </div>

            {/* Scrollable Transaction List */}
            <div className="overflow-y-auto space-y-4 pr-2 pb-6">
              {getExpensesForDay(selectedDate).length > 0 ? (
                getExpensesForDay(selectedDate).map(expense => (
                  <div key={expense.id} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 hover:shadow-md active:scale-[0.98] transition-all duration-200">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-10 rounded-full bg-accent"></div>
                      <div>
                        <p className="font-bold text-gray-900 dark:text-white text-sm">{expense.category}</p>
                        {expense.note && <p className="text-xs text-gray-500 line-clamp-1">{expense.note}</p>}
                      </div>
                    </div>
                    <span className="font-bold text-gray-900 dark:text-white">₹{expense.amount}</span>
                  </div>
                ))
              ) : (
                <div className="text-center py-10">
                  <p className="text-gray-300 font-medium">No expenses on this day.</p>
                </div>
              )}
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default History;