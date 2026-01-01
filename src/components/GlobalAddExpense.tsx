import React, { useState, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, Loader2, Calendar as CalendarIcon } from 'lucide-react';
import { useExpenses } from '../hooks/useExpenses';
import { CATEGORIES } from '../utils/uiUtils';

const GlobalAddExpense = memo(() => {
    const { addExpense } = useExpenses();
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [amount, setAmount] = useState('');
    const [category, setCategory] = useState('Food');
    const [note, setNote] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleCloseModal = () => {
        setIsAddModalOpen(false);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!amount) return;

        setIsSubmitting(true);
        try {
            await addExpense(amount, category, note, date);
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

    return (
        <>
            <motion.button
                layoutId="fab-button"
                onClick={() => setIsAddModalOpen(true)}
                className="fixed bottom-6 right-4 w-[4.5rem] h-[4.5rem] bg-[color-mix(in_srgb,var(--color-accent),transparent_30%)] backdrop-blur-[5px] text-white rounded-full shadow-2xl hover:bg-accent-hover active:scale-95 hover:scale-105 z-40 flex items-center justify-center shadow-accent/30 border border-white/20 will-change-transform"
                aria-label="Add Expense"
                whileTap={{ scale: 0.95 }}
                whileHover={{ scale: 1.05 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
            >
                <Plus className="w-8 h-8" />
            </motion.button>

            <AnimatePresence>
                {isAddModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center pointer-events-none">
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="absolute inset-0 bg-gray-900/50 backdrop-blur-[5px] pointer-events-auto"
                            onClick={handleCloseModal}
                            style={{ willChange: 'opacity' }}
                        />

                        {/* Modal Content */}
                        <motion.div
                            initial={{ y: "100%", opacity: 0, scale: 0.95 }}
                            animate={{ y: 0, opacity: 1, scale: 1 }}
                            exit={{ y: "100%", opacity: 0, scale: 0.95 }}
                            transition={{
                                type: "spring",
                                damping: 25,
                                stiffness: 300,
                                mass: 0.8
                            }}
                            style={{ willChange: 'transform, opacity' }}
                            className="relative z-10 bg-white dark:bg-black w-[95%] md:w-[32rem] max-w-full rounded-[50px] md:rounded-3xl px-6 py-6 md:p-8 shadow-2xl max-h-[90vh] flex flex-col mx-auto mb-3 md:mb-0 border border-gray-200 dark:border-white/10 pointer-events-auto"
                        >
                            <div className="flex justify-between items-center mb-6 shrink-0">
                                <h3 className="text-xl font-bold dark:text-white">New Expense</h3>
                                <button
                                    onClick={handleCloseModal}
                                    className="p-2 bg-gray-100 dark:bg-gray-900 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
                                >
                                    <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                                </button>
                            </div>

                            <div className="overflow-y-auto no-scrollbar">
                                <form onSubmit={handleSave} className="space-y-6">
                                    <div>
                                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">Date</label>
                                        <div className="relative">
                                            <input
                                                type="date"
                                                value={date}
                                                onChange={(e) => setDate(e.target.value)}
                                                className="w-full min-w-0 appearance-none bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl p-3 pl-10 text-base font-semibold text-gray-900 dark:text-white focus:ring-0 focus:border-white/20 focus:outline-none transition-colors"
                                                required
                                            />
                                            <CalendarIcon className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">Amount</label>
                                        <div className="relative">
                                            <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
                                                <span className="text-gray-500 dark:text-gray-400 font-bold text-xl">₹</span>
                                            </div>
                                            <input
                                                type="number"
                                                inputMode="decimal"
                                                value={amount}
                                                onChange={(e) => setAmount(e.target.value)}
                                                placeholder="0"
                                                className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl py-4 pl-10 pr-4 text-xl font-bold text-gray-900 dark:text-white focus:ring-0 focus:border-white/20 focus:outline-none transition-colors"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">Category</label>
                                        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                                            {CATEGORIES.map(cat => (
                                                <button
                                                    key={cat}
                                                    type="button"
                                                    onClick={() => setCategory(cat)}
                                                    className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-colors border ${category === cat ? 'bg-gray-900 dark:bg-white text-white dark:text-black border-gray-900 dark:border-white shadow-lg' : 'bg-white dark:bg-white/5 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20'}`}
                                                >
                                                    {cat}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">Note</label>
                                        <input
                                            type="text"
                                            value={note}
                                            onChange={(e) => setNote(e.target.value)}
                                            placeholder="Add a note..."
                                            className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl p-4 text-base font-medium text-gray-900 dark:text-white focus:ring-0 focus:border-white/20 focus:outline-none transition-colors"
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={isSubmitting || !amount}
                                        className="w-full bg-accent text-white py-4 rounded-xl font-bold text-lg hover:bg-accent-hover transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-xl shadow-accent/20"
                                    >
                                        {isSubmitting && <Loader2 className="w-5 h-5 animate-spin" />}
                                        Save Expense
                                    </button>
                                    <div className="h-6 md:hidden"></div>
                                </form>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </>
    );
});

export default GlobalAddExpense;
