import { useMemo, useState, memo } from "react";
import { format, endOfMonth, eachDayOfInterval, startOfMonth } from "date-fns";
import { Expense } from "../types";
import Card from "./Card";
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, Cell, PieChart, Pie, TooltipProps
} from "recharts";
import { motion, AnimatePresence } from "framer-motion";
import CountUp from "./CountUp";
import { Timestamp } from "firebase/firestore";
import { CATEGORY_COLORS, getCategoryIcon } from "../utils/uiUtils";
import { Calendar, TrendingUp, Sparkles, Trophy, RotateCcw } from "lucide-react";

interface DeepMonthAnalysisProps {
    expenses: Expense[];
    currentMonth: Date;
    theme?: string;
}

const CustomTooltip = memo(({ active, payload, label }: TooltipProps<number, string>) => {
    if (active && payload && payload.length) {
        return (
            <div className="backdrop-blur-md bg-white/80 dark:bg-slate-950/80 shadow-2xl rounded-2xl p-4 border border-white/20 dark:border-white/10 flex flex-col gap-1.5 transition-all duration-200">
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">{label}</p>
                {payload.map((entry, index) => {
                    const isCount = entry.name === "Transactions";
                    return (
                        <div key={index} className="flex flex-col">
                            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">{entry.name}</span>
                            <span className="text-lg font-black text-gray-900 dark:text-white mt-0.5" style={{ color: entry.color || entry.fill }}>
                                {isCount ? "" : "₹"}{isCount ? entry.value : Math.round(Number(entry.value)).toLocaleString('en-IN')}
                            </span>
                        </div>
                    );
                })}
            </div>
        );
    }
    return null;
});

CustomTooltip.displayName = "CustomTooltip";

const DeepMonthAnalysis = memo(({ expenses, currentMonth, theme }: DeepMonthAnalysisProps) => {
    const isDark = theme === "dark";
    const textColor = isDark ? "#9ca3af" : "#6b7280";
    const gridColor = isDark ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.05)";

    // Stateful dashboard interactivity
    const [selectedCategory, setSelectedCategory] = useState<string>("all");
    const [hoveredBarIndex, setHoveredBarIndex] = useState<number | null>(null);
    const [hoveredHistogramIndex, setHoveredHistogramIndex] = useState<number | null>(null);
    const [activeIndex, setActiveIndex] = useState<number | null>(null);
    const [hoveredCategory, setHoveredCategory] = useState<any>(null);

    const totalSpend = useMemo(() => expenses.reduce((sum, e) => sum + Number(e.amount), 0), [expenses]);

    // Analytics calculations inside useMemo
    const analytics = useMemo(() => {
        const monthStart = startOfMonth(currentMonth);
        const monthEnd = endOfMonth(currentMonth);
        const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
        const totalDays = daysInMonth.length;

        let weekdaySpend = 0;
        let weekendSpend = 0;
        let peakExpense: Expense | null = null;
        const dailyMap = new Map();
        
        daysInMonth.forEach(day => {
            dailyMap.set(format(day, "yyyy-MM-dd"), 0);
        });

        for (const e of expenses) {
            const amt = Number(e.amount);
            
            // Single Peak purchase
            if (!peakExpense || amt > Number(peakExpense.amount)) {
                peakExpense = e;
            }

            let d: Date;
            if (e.date instanceof Date) {
                d = e.date;
            } else if (e.date instanceof Timestamp) {
                d = e.date.toDate();
            } else {
                d = new Date(e.date as any);
            }

            const key = format(d, "yyyy-MM-dd");
            if (dailyMap.has(key)) {
                dailyMap.set(key, dailyMap.get(key) + amt);
            }

            // Weekday vs Weekend
            const dayOfWeek = d.getDay();
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
            if (isWeekend) {
                weekendSpend += amt;
            } else {
                weekdaySpend += amt;
            }
        }

        // No-Spend days
        let noSpendDays = 0;
        dailyMap.forEach(spend => {
            if (spend === 0) {
                noSpendDays++;
            }
        });

        const totalSplit = weekdaySpend + weekendSpend || 1;
        const weekdayPct = Math.round((weekdaySpend / totalSplit) * 100);
        const weekendPct = Math.round((weekendSpend / totalSplit) * 100);
        const dailyAverage = totalSpend / totalDays;

        return {
            dailyAverage,
            weekdayPct,
            weekendPct,
            noSpendDays,
            totalDays,
            peakExpense
        };
    }, [expenses, currentMonth, totalSpend]);

    // Filtered data based on interactive category selections
    const chartData = useMemo(() => {
        const monthStart = startOfMonth(currentMonth);
        const monthEnd = endOfMonth(currentMonth);
        const daysInterval = eachDayOfInterval({ start: monthStart, end: monthEnd });

        // Build base daily array
        const dailyMap = new Map();
        daysInterval.forEach(day => {
            dailyMap.set(format(day, "yyyy-MM-dd"), {
                dateStr: format(day, "MMM d"),
                timestamp: day.getTime(),
                spend: 0,
                cumulative: 0
            });
        });

        // Populate with expenses, filtering by selected category if active
        expenses.forEach(e => {
            if (selectedCategory !== "all" && e.category !== selectedCategory) return;

            let d: Date;
            if (e.date instanceof Date) {
                d = e.date;
            } else if (e.date instanceof Timestamp) {
                d = e.date.toDate();
            } else {
                d = new Date(e.date as any);
            }
            const key = format(d, "yyyy-MM-dd");
            if (dailyMap.has(key)) {
                const entry = dailyMap.get(key);
                entry.spend += Number(e.amount);
            }
        });

        let runningTotal = 0;
        const dailyData = Array.from(dailyMap.values()).map(day => {
            runningTotal += day.spend;
            day.cumulative = runningTotal;
            return day;
        });

        // We compute category aggregates using FULL expenses to maintain overall donut/pie integrity
        const categoryTotals: Record<string, number> = {};
        expenses.forEach((e) => {
            categoryTotals[e.category] = (categoryTotals[e.category] || 0) + Number(e.amount);
        });

        const categoryData = Object.entries(categoryTotals)
            .map(([name, size]) => ({ name, size }))
            .sort((a, b) => b.size - a.size);

        // Populate transaction size histogram buckets using filtered expenses
        const histogramBuckets = [
            { name: "0-100", min: 0, max: 100, count: 0, total: 0 },
            { name: "101-500", min: 101, max: 500, count: 0, total: 0 },
            { name: "501-1K", min: 501, max: 1000, count: 0, total: 0 },
            { name: "1K-2K", min: 1001, max: 2000, count: 0, total: 0 },
            { name: "2K-5K", min: 2001, max: 5000, count: 0, total: 0 },
            { name: "5K+", min: 5001, max: Infinity, count: 0, total: 0 },
        ];

        expenses.forEach(e => {
            if (selectedCategory !== "all" && e.category !== selectedCategory) return;
            const amt = Number(e.amount);
            for (const bucket of histogramBuckets) {
                if (amt >= bucket.min && amt <= bucket.max) {
                    bucket.count++;
                    bucket.total += amt;
                    break;
                }
            }
        });

        return {
            dailyData,
            categoryData,
            histogramData: histogramBuckets.filter(b => b.count > 0)
        };
    }, [expenses, currentMonth, selectedCategory]);

    const categoryPieData = useMemo(() => {
        return chartData.categoryData.map(cat => ({
            name: cat.name,
            value: cat.size
        }));
    }, [chartData.categoryData]);

    const activeCategoryInfo = useMemo(() => {
        if (hoveredCategory) {
            const pct = totalSpend > 0 ? Math.round((hoveredCategory.value / totalSpend) * 100) : 0;
            return {
                name: hoveredCategory.name,
                amount: hoveredCategory.value,
                percentage: pct
            };
        }
        if (selectedCategory !== "all") {
            const catItem = categoryPieData.find(c => c.name === selectedCategory);
            if (catItem) {
                const pct = totalSpend > 0 ? Math.round((catItem.value / totalSpend) * 100) : 0;
                return {
                    name: catItem.name,
                    amount: catItem.value,
                    percentage: pct
                };
            }
        }
        return {
            name: "All Categories",
            amount: totalSpend,
            percentage: 100
        };
    }, [hoveredCategory, selectedCategory, categoryPieData, totalSpend]);

    // Framer Motion entry animations
    const containerVariants = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.05
            }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 15 },
        show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 350, damping: 25 } }
    };

    return (
        <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="space-y-6 w-full pb-8 flex flex-col"
        >
            {/* 1. Cascading KPI Analytics Grid */}
            <motion.div 
                variants={containerVariants}
                className="grid grid-cols-2 lg:grid-cols-4 gap-4 w-full"
            >
                {/* Outflow Metric */}
                <motion.div variants={itemVariants}>
                    <Card className="flex flex-col relative overflow-hidden group p-5 h-full">
                        <div className="flex justify-between items-start w-full mb-3 gap-2">
                            <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider leading-snug">
                                Total Outflow
                            </span>
                            <div className="w-7 h-7 rounded-full bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-500 dark:text-indigo-400 flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-110">
                                <TrendingUp size={14} />
                            </div>
                        </div>
                        <div className="flex flex-col gap-1 mt-auto">
                            <span className="text-2xl font-black text-gray-900 dark:text-white leading-none block">
                                ₹<CountUp value={totalSpend} currency={false} />
                            </span>
                            <span className="text-[10px] text-gray-400 dark:text-gray-500 font-semibold block">
                                ₹{Math.round(analytics.dailyAverage)}/day average
                            </span>
                        </div>
                    </Card>
                </motion.div>

                {/* Weekday/Weekend Breakdown */}
                <motion.div variants={itemVariants}>
                    <Card className="flex flex-col relative overflow-hidden group p-5 h-full">
                        <div className="flex justify-between items-start w-full mb-3 gap-2">
                            <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider leading-snug">
                                Weekly Rhythm
                            </span>
                            <div className="w-7 h-7 rounded-full bg-pink-500/10 dark:bg-pink-500/20 text-pink-500 dark:text-pink-400 flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-110">
                                <Calendar size={14} />
                            </div>
                        </div>
                        <div className="flex flex-col gap-2.5 mt-auto">
                            <div className="flex justify-between items-center text-[9px] font-bold text-gray-400 dark:text-gray-500">
                                <span>Wkday <span className="text-indigo-500 font-black">{analytics.weekdayPct}%</span></span>
                                <span>Wkend <span className="text-pink-500 font-black">{analytics.weekendPct}%</span></span>
                            </div>
                            <div className="w-full h-1.5 bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden flex">
                                <div 
                                    className="h-full bg-indigo-500 rounded-l-full transition-all duration-500" 
                                    style={{ width: `${analytics.weekdayPct}%` }}
                                />
                                <div 
                                    className="h-full bg-pink-500 rounded-r-full transition-all duration-500" 
                                    style={{ width: `${analytics.weekendPct}%` }}
                                />
                            </div>
                        </div>
                    </Card>
                </motion.div>

                {/* No-Spend Momentum */}
                <motion.div variants={itemVariants}>
                    <Card className="flex flex-col relative overflow-hidden group p-5 h-full">
                        <div className="flex justify-between items-start w-full mb-3 gap-2">
                            <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider leading-snug">
                                No-Spend Days
                            </span>
                            <div className="w-7 h-7 rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-500 dark:text-emerald-400 flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-110">
                                <Sparkles size={14} />
                            </div>
                        </div>
                        <div className="flex flex-col gap-1 mt-auto">
                            <span className="text-2xl font-black text-gray-900 dark:text-white leading-none block">
                                <CountUp value={analytics.noSpendDays} currency={false} /> <span className="text-xs font-bold text-gray-400 dark:text-gray-500">/ {analytics.totalDays}</span>
                            </span>
                            <span className="text-[10px] text-gray-400 dark:text-gray-500 font-semibold block">
                                {Math.round((analytics.noSpendDays / analytics.totalDays) * 100)}% of month saved
                            </span>
                        </div>
                    </Card>
                </motion.div>

                {/* Top Peak Expense */}
                <motion.div variants={itemVariants}>
                    <Card className="flex flex-col relative overflow-hidden group p-5 h-full">
                        <div className="flex justify-between items-start w-full mb-3 gap-2">
                            <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider leading-snug">
                                Peak Expense
                            </span>
                            <div className="w-7 h-7 rounded-full bg-amber-500/10 dark:bg-amber-500/20 text-amber-500 dark:text-amber-400 flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-110">
                                <Trophy size={14} />
                            </div>
                        </div>
                        <div className="flex flex-col gap-1 mt-auto">
                            {analytics.peakExpense ? (
                                <>
                                    <span className="text-2xl font-black text-gray-900 dark:text-white leading-none block truncate">
                                        ₹{Math.round(Number(analytics.peakExpense.amount)).toLocaleString('en-IN')}
                                    </span>
                                    <span className="text-[10px] text-gray-400 dark:text-gray-500 font-semibold block truncate">
                                        on {analytics.peakExpense.category} ({analytics.peakExpense.note || "No note"})
                                    </span>
                                </>
                            ) : (
                                <>
                                    <span className="text-2xl font-black text-gray-400 dark:text-gray-500 leading-none block">
                                        None
                                    </span>
                                    <span className="text-[10px] text-gray-400 dark:text-gray-500 font-semibold block">
                                        No expenses recorded
                                    </span>
                                </>
                            )}
                        </div>
                    </Card>
                </motion.div>
            </motion.div>

            {/* 2. Stateful Active Filter Banner */}
            <AnimatePresence>
                {selectedCategory !== "all" && (
                    <motion.div 
                        initial={{ opacity: 0, y: -10, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.98 }}
                        className="flex items-center justify-between gap-4 bg-accent/10 border border-accent/20 rounded-2xl p-4 self-stretch shadow-sm"
                    >
                        <div className="flex items-center gap-2.5">
                            <div 
                                className="w-8 h-8 rounded-lg flex items-center justify-center"
                                style={{ backgroundColor: `${CATEGORY_COLORS[selectedCategory] || "#6b7280"}15` }}
                            >
                                {getCategoryIcon(selectedCategory, "16px")}
                            </div>
                            <div>
                                <span className="text-xs font-black text-accent block">
                                    Isolating Category
                                </span>
                                <span className="text-[10px] text-gray-400 dark:text-gray-500 font-bold">
                                    Only showing charts data for <span className="text-gray-700 dark:text-gray-300 font-black">{selectedCategory}</span>
                                </span>
                            </div>
                        </div>
                        <motion.button 
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setSelectedCategory("all")}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-accent/25 hover:bg-accent/35 text-accent text-[10px] font-black transition-all"
                        >
                            <RotateCcw size={10} strokeWidth={3} />
                            Reset
                        </motion.button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* 3. Glowing Area Chart - Spending Velocity */}
            <motion.div variants={itemVariants}>
                <Card>
                    <div className="mb-6 flex justify-between items-start">
                        <div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Spending Velocity</h3>
                            <p className="text-xs text-gray-500 dark:text-gray-500 font-medium">Cumulative spend throughout the month</p>
                        </div>
                    </div>
                    <div className="h-[250px] w-full -ml-4">
                        {expenses.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData.dailyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorCumulative" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                        </linearGradient>
                                        <filter id="shadowFilter" height="200%">
                                            <feDropShadow dx="0" dy="6" stdDeviation="4" floodColor="#6366f1" floodOpacity="0.25" />
                                        </filter>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
                                    <XAxis dataKey="dateStr" tick={{ fontSize: 9, fill: textColor }} tickMargin={10} minTickGap={20} axisLine={false} tickLine={false} />
                                    <YAxis tickFormatter={(val) => `₹${val >= 1000 ? (val / 1000).toFixed(0) + 'k' : val}`} tick={{ fontSize: 9, fill: textColor }} axisLine={false} tickLine={false} />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Area 
                                        type="monotone" 
                                        dataKey="cumulative" 
                                        name="Total Spend" 
                                        stroke="#6366f1" 
                                        strokeWidth={3} 
                                        fillOpacity={1} 
                                        fill="url(#colorCumulative)"
                                        filter="url(#shadowFilter)"
                                        activeDot={{ r: 6, fill: "#6366f1", strokeWidth: 0 }}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full w-full flex items-center justify-center text-sm font-medium text-gray-400">
                                No data available
                            </div>
                        )}
                    </div>
                </Card>
            </motion.div>

            {/* 4. Interactive Bar Chart - Daily Breakdown */}
            <motion.div variants={itemVariants}>
                <Card>
                    <div className="mb-6">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Daily Breakdown</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-500 font-medium">Exact amount spent each day</p>
                    </div>
                    <div className="h-[200px] w-full -ml-4">
                        {expenses.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData.dailyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
                                    <XAxis dataKey="dateStr" tick={{ fontSize: 9, fill: textColor }} tickMargin={10} minTickGap={20} axisLine={false} tickLine={false} />
                                    <YAxis tickFormatter={(val) => `₹${val >= 1000 ? (val / 1000).toFixed(0) + 'k' : val}`} tick={{ fontSize: 9, fill: textColor }} axisLine={false} tickLine={false} />
                                    <Tooltip content={<CustomTooltip />} cursor={{ fill: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }} />
                                    <Bar 
                                        dataKey="spend" 
                                        name="Daily Spend" 
                                        radius={[4, 4, 0, 0]}
                                        onMouseEnter={(_, index) => setHoveredBarIndex(index)}
                                        onMouseLeave={() => setHoveredBarIndex(null)}
                                    >
                                        {chartData.dailyData.map((entry, index) => {
                                            const isHovered = hoveredBarIndex === index;
                                            const isAnyHovered = hoveredBarIndex !== null;
                                            
                                            // Spectrum Color assignment based on spending severity
                                            let cellColor = '#3b82f6'; // Low (<500): Indigo/Blue
                                            if (entry.spend > 2000) cellColor = '#ef4444'; // High (>2000): Red
                                            else if (entry.spend > 500) cellColor = '#f59e0b'; // Mid (500-2000): Amber
                                            
                                            return (
                                                <Cell 
                                                    key={`cell-${index}`} 
                                                    fill={cellColor} 
                                                    opacity={isAnyHovered ? (isHovered ? 1.0 : 0.4) : 0.85}
                                                    style={{
                                                        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                                                        transform: isHovered ? 'scaleY(1.04)' : 'scaleY(1)',
                                                        transformOrigin: 'bottom',
                                                        filter: isHovered ? 'brightness(1.1) drop-shadow(0px 4px 8px rgba(0,0,0,0.12))' : 'none',
                                                        cursor: 'pointer'
                                                    }}
                                                />
                                            );
                                        })}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full w-full flex items-center justify-center text-sm font-medium text-gray-400">
                                No data available
                            </div>
                        )}
                    </div>
                </Card>
            </motion.div>

            {/* 5. Histogram - Transaction Sizes */}
            <motion.div variants={itemVariants}>
                <Card>
                    <div className="mb-6">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Transaction Sizes</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-500 font-medium">Frequency of small vs large purchases</p>
                    </div>
                    <div className="h-[200px] w-full -ml-4">
                        {expenses.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData.histogramData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
                                    <XAxis dataKey="name" tick={{ fontSize: 9, fill: textColor }} tickMargin={10} interval={0} axisLine={false} tickLine={false} />
                                    <YAxis tickFormatter={(val) => `${val}`} tick={{ fontSize: 9, fill: textColor }} axisLine={false} tickLine={false} />
                                    <Tooltip content={<CustomTooltip />} cursor={{ fill: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }} />
                                    <Bar 
                                        dataKey="count" 
                                        name="Transactions" 
                                        fill="#10b981" 
                                        radius={[4, 4, 0, 0]}
                                        onMouseEnter={(_, index) => setHoveredHistogramIndex(index)}
                                        onMouseLeave={() => setHoveredHistogramIndex(null)}
                                    >
                                        {chartData.histogramData.map((_, index) => {
                                            const isHovered = hoveredHistogramIndex === index;
                                            const isAnyHovered = hoveredHistogramIndex !== null;
                                            return (
                                                <Cell 
                                                    key={`cell-${index}`} 
                                                    fill="#10b981"
                                                    opacity={isAnyHovered ? (isHovered ? 1.0 : 0.45) : 0.85}
                                                    style={{
                                                        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                                                        transform: isHovered ? 'scaleY(1.04)' : 'scaleY(1)',
                                                        transformOrigin: 'bottom',
                                                        filter: isHovered ? 'brightness(1.1)' : 'none',
                                                        cursor: 'pointer'
                                                    }}
                                                />
                                            );
                                        })}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full w-full flex items-center justify-center text-sm font-medium text-gray-400 ml-4">
                                No data available
                            </div>
                        )}
                    </div>
                </Card>
            </motion.div>

            {/* 6. Stunning Interactive Category Density (Donut + Grid) */}
            <motion.div variants={itemVariants}>
                <Card>
                    <div className="mb-4">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Category Density</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-500 font-medium">Relative size of category spending. Click segments to filter everything.</p>
                    </div>

                    {categoryPieData.length > 0 ? (
                        <div className="flex flex-col md:flex-row items-center justify-between gap-6 md:gap-8 py-4">
                            {/* Donut Container */}
                            <div className="relative flex justify-center items-center w-full md:w-1/2 h-[240px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={categoryPieData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={65}
                                            outerRadius={85}
                                            paddingAngle={3}
                                            dataKey="value"
                                            onMouseEnter={(data, idx) => {
                                                setActiveIndex(idx);
                                                setHoveredCategory(data);
                                            }}
                                            onMouseLeave={() => {
                                                setActiveIndex(null);
                                                setHoveredCategory(null);
                                            }}
                                            onClick={(data) => {
                                                const catName = data.name;
                                                setSelectedCategory(prev => prev === catName ? "all" : catName);
                                            }}
                                            className="focus:outline-none"
                                        >
                                            {categoryPieData.map((entry, idx) => {
                                                const isHovered = activeIndex === idx;
                                                const color = CATEGORY_COLORS[entry.name] || "#6b7280";
                                                return (
                                                    <Cell 
                                                        key={`cell-${idx}`} 
                                                        fill={color}
                                                        opacity={activeIndex !== null ? (isHovered ? 1 : 0.6) : 0.9}
                                                        style={{
                                                            transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
                                                            transform: isHovered ? 'scale(1.05)' : 'scale(1)',
                                                            transformOrigin: '50% 50%',
                                                            filter: isHovered ? `drop-shadow(0px 6px 12px ${color}33) brightness(1.04)` : 'none',
                                                            cursor: 'pointer'
                                                        }}
                                                    />
                                                );
                                            })}
                                        </Pie>
                                    </PieChart>
                                </ResponsiveContainer>

                                {/* Gorgeous Floating center summary box */}
                                <div className="absolute flex flex-col items-center justify-center text-center pointer-events-none w-36 h-36 rounded-full">
                                    <span className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest block max-w-[125px] truncate">
                                        {activeCategoryInfo.name}
                                    </span>
                                    <span className="text-2xl font-black text-gray-900 dark:text-white mt-1 leading-none">
                                        ₹{Math.round(activeCategoryInfo.amount).toLocaleString('en-IN')}
                                    </span>
                                    <span className="text-[10px] font-black text-accent mt-2 bg-accent/10 px-2 py-0.5 rounded-full">
                                        {activeCategoryInfo.percentage}% share
                                    </span>
                                </div>
                            </div>

                            {/* Clickable Grid Legend */}
                            <div className="w-full md:w-1/2 grid grid-cols-2 gap-2">
                                {categoryPieData.map((cat) => {
                                    const isSelected = selectedCategory === cat.name;
                                    const color = CATEGORY_COLORS[cat.name] || "#6b7280";
                                    const percentage = totalSpend > 0 ? Math.round((cat.value / totalSpend) * 100) : 0;

                                    return (
                                        <motion.button
                                            key={cat.name}
                                            whileHover={{ scale: 1.02, y: -1 }}
                                            whileTap={{ scale: 0.98 }}
                                            onClick={() => setSelectedCategory(prev => prev === cat.name ? "all" : cat.name)}
                                            className={`flex items-center gap-2.5 p-3 rounded-2xl border transition-all text-left ${
                                                isSelected
                                                    ? "bg-accent/10 border-accent/40 text-accent dark:bg-accent/15"
                                                    : "bg-gray-50/50 hover:bg-gray-100 dark:bg-white/5 dark:hover:bg-white/10 border-gray-100 dark:border-gray-800 text-gray-700 dark:text-gray-300"
                                            }`}
                                        >
                                            <div 
                                                className="w-7.5 h-7.5 rounded-xl flex items-center justify-center shrink-0"
                                                style={{ backgroundColor: `${color}15` }}
                                            >
                                                {getCategoryIcon(cat.name, "15px", color)}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <span className="text-xs font-black block truncate">{cat.name}</span>
                                                <span className="text-[10px] text-gray-400 dark:text-gray-500 font-semibold">{percentage}% share</span>
                                            </div>
                                        </motion.button>
                                    );
                                })}
                            </div>
                        </div>
                    ) : (
                        <div className="h-[200px] w-full flex items-center justify-center text-sm font-medium text-gray-400">
                            No data available
                        </div>
                    )}
                </Card>
            </motion.div>

        </motion.div>
    );
});

DeepMonthAnalysis.displayName = "DeepMonthAnalysis";

export default DeepMonthAnalysis;