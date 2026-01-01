import { useMemo, useState } from 'react';
import {
    TrendingUp,
    TrendingDown,
    Loader2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, subMonths } from 'date-fns';
import { useExpenses, useRecentExpenses, useMonthlyStats, useExpensesForMonth } from '../hooks/useExpenses';
import { Timestamp } from 'firebase/firestore';
import SwipeableExpenseItem from '../components/SwipeableExpenseItem';
import { getCategoryIcon } from '../utils/uiUtils';

import CountUp from '../components/CountUp';

const container = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1
        }
    }
};

const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
};

const Home = () => {
    const { expenses, loading: loadingRecent } = useRecentExpenses();
    const { stats, loading: loadingStats } = useMonthlyStats();
    const { deleteExpense } = useExpenses();
    const [showTooltip, setShowTooltip] = useState(false);

    const lastMonthDate = subMonths(new Date(), 1);
    const { expenses: lastMonthExpenses } = useExpensesForMonth(lastMonthDate, stats);

    // Derived State (Calculations)
    const { currentMonthTotal, percentageChange, trendDirection, lastMonthPartialSum, diff } = useMemo(() => {
        const now = new Date();
        const currentMonthKey = format(now, 'yyyy-MM');

        // @ts-ignore
        const thisMonthStat = stats.find(s => s.monthKey === currentMonthKey);

        const thisMonthSum = thisMonthStat ? Number(thisMonthStat.total) : 0;

        // Calculate "Last Month to Same Date"
        const currentDay = now.getDate();
        const lastMonthPartialSum = lastMonthExpenses.reduce((acc, expense) => {
            const expenseDate = expense.date instanceof Timestamp ? expense.date.toDate() : expense.date;
            // @ts-ignore - Handle potential date type issues safely
            if (expenseDate && expenseDate.getDate() <= currentDay) {
                return acc + Number(expense.amount);
            }
            return acc;
        }, 0);

        let pctChange = 0;
        if (lastMonthPartialSum > 0) {
            pctChange = ((thisMonthSum - lastMonthPartialSum) / lastMonthPartialSum) * 100;
        }

        const isTrendingUp = thisMonthSum > lastMonthPartialSum;

        return {
            currentMonthTotal: thisMonthSum,
            percentageChange: Math.abs(pctChange).toFixed(0),
            trendDirection: isTrendingUp ? 'up' : 'down',
            lastMonthPartialSum,
            lastMonthDate,
            diff: Math.abs(thisMonthSum - lastMonthPartialSum)
        };
    }, [stats, lastMonthExpenses]);


    if (loadingRecent || loadingStats) {
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
                            <CountUp value={currentMonthTotal} />
                        </h1>
                    </div>
                </div>

                <div className="flex items-center space-x-2 pt-2">
                    <div 
                        className="relative flex items-center"
                        onMouseEnter={() => setShowTooltip(true)}
                        onMouseLeave={() => setShowTooltip(false)}
                        onClick={() => setShowTooltip(!showTooltip)}
                    >
                        <motion.div
                            className={`absolute inset-0 rounded-full border ${trendDirection === 'down' ? 'border-green-400' : 'border-red-400'}`}
                            initial={{ opacity: 0.2, scale: 1 }}
                            animate={{ 
                                opacity: 0,
                                scale: 1.3
                            }}
                            transition={{
                                duration:  2,
                                repeat: Infinity,
                                ease: "easeOut"
                            }}
                        />
                         <motion.div
                            className={`absolute inset-0 rounded-full border ${trendDirection === 'down' ? 'border-green-400' : 'border-red-400'}`}
                            initial={{ opacity: 0.2, scale: 1 }}
                            animate={{ 
                                opacity: 0,
                                scale: 1.3
                            }}
                            transition={{
                                duration: 2,
                                repeat: Infinity,
                                ease: "easeOut",
                                delay: 1
                            }}
                        />
                        <div className={`cursor-pointer relative z-10 flex items-center justify-center px-2 py-1 rounded-full ${trendDirection === 'down' ? 'bg-green-50 dark:bg-green-500/20 text-green-700 dark:text-green-400' : 'bg-red-50 dark:bg-red-500/20 text-red-700 dark:text-red-400'}`}>
                            {trendDirection === 'down' ? <TrendingDown className="w-4 h-4 mr-1" /> : <TrendingUp className="w-4 h-4 mr-1" />}
                            <span className="text-xs font-semibold">
                                {percentageChange}% {trendDirection === 'down' ? 'less' : 'more'} than last month
                            </span>
                        </div>
                        <AnimatePresence>
                            {showTooltip && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 10 }}
                                    className="absolute top-full left-0 mt-2 z-50 w-64 p-3 bg-white dark:bg-zinc-800 rounded-xl shadow-xl border border-gray-100 dark:border-zinc-700/50"
                                >
                                    <p className="text-xs text-gray-600 dark:text-gray-300">
                                        You had spent <span className="font-bold text-gray-900 dark:text-white">₹{lastMonthPartialSum.toLocaleString()}</span> till {format(lastMonthDate, 'do')} of last month.
                                        <br/>
                                        <span className="mt-1 block">
                                            That's <span className={trendDirection === 'down' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>₹{diff.toLocaleString()} {trendDirection === 'down' ? 'less' : 'more'}</span> than your current spend.
                                        </span>
                                    </p>
                                    <div className="absolute -top-1 left-4 w-2 h-2 bg-white dark:bg-zinc-800 border-l border-t border-gray-100 dark:border-zinc-700/50 transform rotate-45"></div>
                                </motion.div>
                            )}
                        </AnimatePresence>
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
                        <motion.div
                            variants={container}
                            initial="hidden"
                            animate="show"
                            className="space-y-4"
                        >
                            <AnimatePresence mode='popLayout'>
                                {expenses.map((t) => (
                                    <motion.div key={t.id} variants={item} layout>
                                        <SwipeableExpenseItem
                                            t={t}
                                            getCategoryIcon={getCategoryIcon}
                                            onDelete={deleteExpense}
                                        />
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </motion.div>
                    )}
                </div>
            </section>
        </div>
    );
};

export default Home;
