import React, { useMemo } from 'react';
import {
    Apple,
    PartyPopper,
    TrendingUp,
    TrendingDown,
    ShoppingCart,
    Car,
    IndianRupee,
    Loader2,
    Trash2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, isSameMonth, subMonths } from 'date-fns';
import { useExpenses, useRecentExpenses } from '../hooks/useExpenses';
import Card from '../components/Card';
import SwipeableExpenseItem from '../components/SwipeableExpenseItem';

// Utility for clean currency formatting
const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0
    }).format(amount);
};



const Home = () => {
    const { expenses, loading } = useRecentExpenses();
    const { deleteExpense } = useExpenses();

    // Derived State (Calculations)
    const { currentMonthTotal, percentageChange, trendDirection } = useMemo(() => {
        const now = new Date();
        const lastMonthDate = subMonths(now, 1);

        const thisMonthExpenses = expenses.filter(e => e.date && isSameMonth(e.date, now));
        const lastMonthExpenses = expenses.filter(e => e.date && isSameMonth(e.date, lastMonthDate));

        const thisMonthSum = thisMonthExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
        const lastMonthSum = lastMonthExpenses.reduce((sum, e) => sum + Number(e.amount), 0);

        let pctChange = 0;
        if (lastMonthSum > 0) {
            pctChange = ((thisMonthSum - lastMonthSum) / lastMonthSum) * 100;
        }

        return {
            currentMonthTotal: thisMonthSum,
            percentageChange: Math.abs(pctChange).toFixed(0),
            trendDirection: thisMonthSum > lastMonthSum ? 'up' : 'down'
        };
    }, [expenses]);

    const handleCloseModal = () => {
        setIsClosing(true);
        setTimeout(() => {
            setIsAddModalOpen(false);
            setIsClosing(false);
        }, 500); // Match animation duration
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (!amount) return;

        setIsSubmitting(true);
        try {
            await addExpense(amount, category, note, date);

            // Reset Form & Close with Animation
            setAmount('');
            setCategory('Food');
            setNote('');
            setDate(new Date().toISOString().split('T')[0]);
            handleCloseModal();
        } catch (error) {
            console.error("Failed to add expense", error);
        } finally {
            setIsSubmitting(false);
        }
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

    if (loading) {
        return (
            <div className="flex justify-center items-center h-[50vh]">
                <Loader2 className="w-8 h-8 animate-spin text-gray-300" />
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-fade-in pt-4">

            {/* Hero Section */}
            <header className="flex flex-col space-y-2">
                <div className="flex justify-between items-start">
                    <div>
                        <span className="text-sm font-semibold text-gray-400 uppercase tracking-wide">
                            {format(new Date(), 'MMMM yyyy')}
                        </span>
                        <h1 className="text-5xl font-bold text-gray-900 dark:text-white mt-2 tracking-tight">
                            {formatCurrency(currentMonthTotal)}
                        </h1>
                    </div>
                </div>

                <div className="flex items-center space-x-2 pt-2">
                    <div className={`flex items-center justify-center px-2 py-1 rounded-full ${trendDirection === 'down' ? 'bg-green-50 dark:bg-green-500/20 text-green-700 dark:text-green-400' : 'bg-red-50 dark:bg-red-500/20 text-red-700 dark:text-red-400'}`}>
                        {trendDirection === 'down' ? <TrendingDown className="w-4 h-4 mr-1" /> : <TrendingUp className="w-4 h-4 mr-1" />}
                        <span className="text-xs font-semibold">
                            {percentageChange}% vs last month
                        </span>
                    </div>
                </div>
            </header>

            {/* Transaction List */}
            <section className="pb-32 md:pb-0">
                <div className="flex justify-between items-end mb-6">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">Recent</h3>
                </div>

                <div className="space-y-4">
                    {expenses.length === 0 ? (
                        <div className="text-center py-10 border-2 border-dashed border-gray-100 rounded-2xl">
                            <p className="text-gray-400 text-sm">No expenses yet.</p>
                            <p className="text-gray-300 text-xs mt-1">Tap + to add one.</p>
                        </div>
                    ) : (
                        <AnimatePresence>
                            {expenses.map((t) => (
                                <SwipeableExpenseItem
                                    key={t.id}
                                    t={t}
                                    getCategoryIcon={getCategoryIcon}
                                    onDelete={deleteExpense}
                                />
                            ))}
                        </AnimatePresence>
                    )}
                </div>
            </section>
        </div>
    );
};

export default Home;