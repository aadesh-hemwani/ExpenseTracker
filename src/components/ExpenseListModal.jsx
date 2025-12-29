import React, { useMemo } from 'react';
import { X } from 'lucide-react';
import { useExpenses } from '../hooks/useExpenses';
import { getCategoryIcon, CATEGORIES } from '../utils/uiUtils';
import { formatCurrency } from '../utils/formatUtils';
import { format } from 'date-fns';

const ExpenseListModal = ({ title, onClose, isClosing, expenses = [] }) => {
    const { deleteExpense } = useExpenses();

    const total = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

    return (
        <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center">
            {/* Backdrop (Click to close) */}
            <div
                className={`absolute inset-0 bg-gray-900/30 backdrop-blur-sm transition-opacity ${isClosing ? 'animate-fade-out' : 'animate-fade-in'}`}
                onClick={onClose}
            />

            {/* Content Card */}
            <div className={`relative z-10 bg-white dark:bg-black w-[95%] max-w-md rounded-[50px] md:rounded-3xl p-6 shadow-2xl border border-gray-200/50 dark:border-white/10 max-h-[70vh] flex flex-col mb-3 md:mb-0 ${isClosing ? 'animate-slide-down' : 'animate-slide-up'}`}>

                {/* Modal Header */}
                <div className="flex justify-between items-center mb-6 shrink-0">
                    <div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            {CATEGORIES.includes(title) && <span className="p-2 bg-gray-100 dark:bg-white/10 rounded-full">{getCategoryIcon(title)}</span>}
                            {title}
                        </h3>
                        <p className="text-sm text-gray-500 font-medium mt-1">
                            Total: <span className="text-gray-900 dark:text-white font-bold">{formatCurrency(total)}</span>
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 bg-gray-100 dark:bg-dark-card rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    </button>
                </div>

                {/* Scrollable Transaction List */}
                <div className="overflow-y-auto pr-2 pb-6 min-h-[200px]">
                    {expenses.length > 0 ? (
                        <div className="flex flex-col">
                            {expenses.map((expense, index) => (
                                <div
                                    key={expense.id}
                                    className={`flex justify-between items-center py-4 ${index !== expenses.length - 1 ? 'border-b border-gray-100 dark:border-white/5' : ''}`}
                                >
                                    <div className="flex flex-col gap-1">
                                        <span className="text-gray-900 dark:text-white font-medium text-[15px]">
                                            {expense.note || 'Unknown Expense'}
                                        </span>
                                        <span className="text-xs text-gray-400 font-medium">
                                            {format(new Date(expense.date), 'MMM dd')}
                                        </span>
                                    </div>
                                    <span className="text-gray-900 dark:text-white font-bold">
                                        {formatCurrency(expense.amount)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-10">
                            <p className="text-gray-300 font-medium">No expenses found.</p>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
};

export default ExpenseListModal;
