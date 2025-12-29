import React from 'react';
import { motion, useMotionValue, useAnimation } from 'framer-motion';
import { Trash2 } from 'lucide-react';
import { format } from 'date-fns';


import { formatCurrency } from '../utils/formatUtils';

const SwipeableExpenseItem = React.memo(({ t, getCategoryIcon, onDelete, className = "", cardClassName = "" }) => {
    const controls = useAnimation();
    const x = useMotionValue(0);

    const handleDragEnd = async (event, info) => {
        const offset = info.offset.x;
        const velocity = info.velocity.x;

        // If swiped left enough, snap open to reveal button
        if (offset < -50 || velocity < -500) {
            await controls.start({ x: -80, transition: { type: "spring", stiffness: 300, damping: 30 } });
        } else {
            // Otherwise snap back to closed
            await controls.start({ x: 0, transition: { type: "spring", stiffness: 300, damping: 30 } });
        }
    };

    return (
        <motion.div
            className={`relative mb-4 ${className}`}
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
        >
            {/* Delete Background Layer (The Button) */}
            <div className="absolute top-1/2 -translate-y-1/2 right-4 w-12 h-12 bg-red-500 rounded-full flex items-center justify-center z-0">
                <button
                    onClick={() => onDelete(t.id)}
                    className="w-full h-full flex items-center justify-center text-white"
                    aria-label="Delete"
                >
                    <Trash2 className="w-6 h-6" />
                </button>
            </div>

            {/* Foreground Card */}
            <motion.div
                style={{ x }}
                animate={controls}
                drag="x"
                dragConstraints={{ left: -80, right: 0 }}
                dragElastic={0.1}
                onDragEnd={handleDragEnd}
                whileTap={{ scale: 0.98 }}
                className={`relative z-10 flex items-center justify-between p-4 bg-white dark:bg-dark-card rounded-2xl border-[0.5px] border-gray-200/20 dark:border-white/10 dark:shadow-none shadow-[0_0_20px_rgba(70,70,70,0.15)] ${cardClassName}`}
            >
                <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-gray-50 dark:bg-white/5 rounded-full flex items-center justify-center border border-gray-100 dark:border-white/10">
                        {getCategoryIcon(t.category)}
                    </div>
                    <div className="text-left">
                        <p className="font-semibold text-gray-900 dark:text-white text-sm">{t.category}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                            {t.date ? format(t.date, 'MMM dd') : 'Just now'}
                        </p>
                    </div>
                </div>
                <div className="text-right">
                    <span className="font-bold text-gray-900 dark:text-white block text-sm">
                        {formatCurrency(t.amount)}
                    </span>
                    {t.note && (
                        <span className="text-xs text-gray-400 truncate max-w-[12rem] md:max-w-xs block">{t.note}</span>
                    )}
                </div>
            </motion.div>
        </motion.div>
    );
});

export default SwipeableExpenseItem;
