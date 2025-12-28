import React, { useMemo } from 'react';
import { format, isSameDay } from 'date-fns';
import { X, Loader2 } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import { useExpenses } from '../hooks/useExpenses'; // Still need deleteExpense
import SwipeableExpenseItem from './SwipeableExpenseItem';
import { getCategoryIcon } from '../utils/uiUtils';
import { formatCurrency } from '../utils/formatUtils';

const DayDetailModal = ({ selectedDate, onClose, isClosing, expenses = [] }) => {
    // 1. Remove internal fetch. Use props.
    const { deleteExpense } = useExpenses();

    // 2. Filter for the specific day client-side
    const dayExpenses = useMemo(() => {
        return expenses.filter(e => isSameDay(e.date, select`edDate));
    }, [expenses, selectedDate]);

    const dailyTotal = dayExpenses.reduce((sum, e) => sum + Number(e.amount), 0);

    return (
        <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center">
            {/* 1. Backdrop (Click to close) */}
            <div
                className={`absolute inset - 0 bg - gray - 900 / 30 backdrop - blur - sm transition - opacity ${ isClosing? 'animate-fade-out': 'animate-fade-in' }`}
                onClick={onClose}
            />

            {/* 2. Content Card */}
            <div className={`relative z - 10 bg - white dark: bg - black w - [95 %] max - w - md rounded - [50px] md: rounded - 3xl p - 6 shadow - 2xl border border - gray - 200 / 50 dark: border - white / 10 max - h - [70vh] flex flex - col mb - 3 md: mb - 0 ${ isClosing? 'animate-slide-down': 'animate-slide-up' }`}>

                {/* Modal Header */}
                <div className="flex justify-between items-center mb-6 shrink-0">
                    <div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                            {format(selectedDate, 'EEEE, MMM do')}
                        </h3>
                        <p className="text-sm text-gray-500 font-medium mt-1">
                            Daily Total: <span className="text-gray-900 dark:text-white font-bold">{formatCurrency(dailyTotal)}</span>
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 bg-gray-100 dark:bg-gray-900 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    </button>
                </div>

                {/* Scrollable Transaction List */}
                <div className="overflow-y-auto space-y-4 pr-2 pb-6 min-h-[200px]">
                    {dayExpenses.length > 0 ? (
                        <AnimatePresence>
                            {dayExpenses.map(expense => (
                                <SwipeableExpenseItem
                                    key={expense.id}
                                    t={expense}
                                    getCategoryIcon={getCategoryIcon}
                                    onDelete={deleteExpense}
                                    className="mb-0"
                                />
                            ))}
                        </AnimatePresence>
                    ) : (
                        <div className="text-center py-10">
                            <p className="text-gray-300 font-medium">No expenses on this day.</p>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
};

export default DayDetailModal;
