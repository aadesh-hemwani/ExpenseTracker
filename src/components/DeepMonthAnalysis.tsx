import React, { useMemo } from "react";
import { format, endOfMonth, eachDayOfInterval, startOfMonth } from "date-fns";
import { Expense } from "../types";
import Card from "./Card";
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, Cell,
    Treemap
} from "recharts";
import { motion } from "framer-motion";
import CountUp from "./CountUp";

interface DeepMonthAnalysisProps {
    expenses: Expense[];
    currentMonth: Date;
    theme?: string;
}

// Custom Tooltip for Recharts to match our app styling
const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-xl rounded-xl p-3 text-sm">
                <p className="font-bold text-gray-900 dark:text-white mb-1">{label}</p>
                {payload.map((entry: any, index: number) => {
                    const isCount = entry.name === "Transactions";
                    return (
                        <p key={index} className="font-medium" style={{ color: entry.color || entry.fill }}>
                            {entry.name}: {isCount ? "" : "₹"}{isCount ? entry.value : Math.round(entry.value).toLocaleString('en-IN')}
                        </p>
                    );
                })}
            </div>
        );
    }
    return null;
};

// Custom Treemap Content
const CustomizedTreemapContent = (props: any) => {
    const { root, depth, x, y, width, height, index, colors, name } = props;

    if (!root || !root.children) return null;

    return (
        <g>
            <rect
                x={x}
                y={y}
                width={width}
                height={height}
                style={{
                    fill: depth < 2 ? colors[Math.floor((index / root.children.length) * 6)] : '#ffffff00',
                    stroke: '#fff',
                    strokeWidth: 2 / (depth + 1e-10),
                    strokeOpacity: 1 / (depth + 1e-10),
                }}
                rx={8}
            />
            {depth === 1 && width > 40 && height > 30 ? (
                <text
                    x={x + width / 2}
                    y={y + height / 2 + 7}
                    textAnchor="middle"
                    fill="#fff"
                    fontSize={12}
                    fontWeight="bold"
                >
                    {name}
                </text>
            ) : null}
        </g>
    );
};


const DeepMonthAnalysis: React.FC<DeepMonthAnalysisProps> = ({ expenses, currentMonth, theme }) => {
    const isDark = theme === "dark";
    const textColor = isDark ? "#9ca3af" : "#6b7280";
    const gridColor = isDark ? "#1f2937" : "#f3f4f6";

    const chartData = useMemo(() => {
        // 1. Prepare Daily Data (Area & Bar)
        const monthStart = startOfMonth(currentMonth);
        const monthEnd = endOfMonth(currentMonth);
        const daysInterval = eachDayOfInterval({ start: monthStart, end: monthEnd });

        // Initialize daily map
        const dailyMap = new Map();
        daysInterval.forEach(day => {
            dailyMap.set(format(day, "yyyy-MM-dd"), {
                dateStr: format(day, "MMM d"),
                timestamp: day.getTime(),
                spend: 0,
                cumulative: 0
            });
        });

        // Aggregate daily spend
        expenses.forEach(e => {
            let d: Date;
            if (e.date instanceof Date) {
                d = e.date;
                // @ts-ignore
            } else if (e.date && typeof e.date.toDate === 'function') {
                // @ts-ignore
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

        // Calculate cumulative
        let runningTotal = 0;
        const dailyData = Array.from(dailyMap.values()).map(day => {
            runningTotal += day.spend;
            day.cumulative = runningTotal;
            return day;
        });

        // 2. Prepare Category Data (Treemap/Pie)
        const categoryTotals: Record<string, number> = {};
        expenses.forEach((e) => {
            categoryTotals[e.category] = (categoryTotals[e.category] || 0) + Number(e.amount);
        });

        const categoryData = Object.entries(categoryTotals)
            .map(([name, size]) => ({ name, size }))
            .sort((a, b) => b.size - a.size); // Sort largest first

        const histogramBuckets = [
            { name: "0-100", min: 0, max: 100, count: 0, total: 0 },
            { name: "101-500", min: 101, max: 500, count: 0, total: 0 },
            { name: "501-1K", min: 501, max: 1000, count: 0, total: 0 },
            { name: "1K-2K", min: 1001, max: 2000, count: 0, total: 0 },
            { name: "2K-5K", min: 2001, max: 5000, count: 0, total: 0 },
            { name: "5K+", min: 5001, max: Infinity, count: 0, total: 0 },
        ];

        expenses.forEach(e => {
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
            histogramData: histogramBuckets.filter(b => b.count > 0) // Only show non-empty buckets
        };
    }, [expenses, currentMonth]);

    // Accent Colors for Charts
    const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316', '#eab308', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9'];

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6 w-full pb-8"
        >
            {/* Header Stats */}
            {expenses.length > 0 && (
                <div className="flex flex-col mb-2">
                    <span className="text-gray-500 dark:text-gray-400 font-medium text-sm block mb-1">
                        Total Spend
                    </span>
                    <div className="flex items-end justify-between">
                        <span className="text-4xl font-black tracking-tight text-gray-900 dark:text-white leading-none">
                            ₹<CountUp value={expenses.reduce((sum, e) => sum + Number(e.amount), 0)} currency={false} />
                        </span>
                        <span className="px-3 py-1 bg-accent/10 text-accent font-bold text-xs rounded-full">
                            <CountUp value={expenses.length} currency={false} /> Transaction{expenses.length !== 1 ? 's' : ''}
                        </span>
                    </div>
                </div>
            )}
            {/* 1. Cumulative Velocity (Area Chart) */}
            <Card>
                <div className="mb-6">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Spending Velocity</h3>
                    <p className="text-xs text-gray-500 font-medium">Cumulative spend throughout the month</p>
                </div>
                <div className="h-[250px] w-full -ml-4">
                    {expenses.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData.dailyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorCumulative" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
                                <XAxis dataKey="dateStr" tick={{ fontSize: 10, fill: textColor }} tickMargin={10} minTickGap={20} axisLine={false} tickLine={false} />
                                <YAxis tickFormatter={(val) => `₹${val >= 1000 ? (val / 1000).toFixed(0) + 'k' : val}`} tick={{ fontSize: 10, fill: textColor }} axisLine={false} tickLine={false} />
                                <Tooltip content={<CustomTooltip />} />
                                <Area type="monotone" dataKey="cumulative" name="Total Spend" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorCumulative)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-full w-full flex items-center justify-center text-sm font-medium text-gray-400">
                            No data available
                        </div>
                    )}
                </div>
            </Card>

            {/* 2. Daily Spikes (Bar Chart) */}
            <Card>
                <div className="mb-6">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Daily Breakdown</h3>
                    <p className="text-xs text-gray-500 font-medium">Exact amount spent each day</p>
                </div>
                <div className="h-[200px] w-full -ml-4">
                    {expenses.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData.dailyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
                                <XAxis dataKey="dateStr" tick={{ fontSize: 10, fill: textColor }} tickMargin={10} minTickGap={20} axisLine={false} tickLine={false} />
                                <YAxis tickFormatter={(val) => `₹${val >= 1000 ? (val / 1000).toFixed(0) + 'k' : val}`} tick={{ fontSize: 10, fill: textColor }} axisLine={false} tickLine={false} />
                                <Tooltip content={<CustomTooltip />} cursor={{ fill: isDark ? '#374151' : '#f3f4f6' }} />
                                <Bar dataKey="spend" name="Daily Spend" radius={[4, 4, 0, 0]}>
                                    {chartData.dailyData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.spend > 2000 ? '#ef4444' : entry.spend > 500 ? '#f59e0b' : '#3b82f6'} />
                                    ))}
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

            {/* 3. Expense Size Distribution (Histogram) */}
            <Card>
                <div className="mb-6">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Transaction Sizes</h3>
                    <p className="text-xs text-gray-500 font-medium">Frequency of small vs large purchases</p>
                </div>
                <div className="h-[200px] w-full -ml-4">
                    {expenses.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData.histogramData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
                                <XAxis dataKey="name" tick={{ fontSize: 10, fill: textColor }} tickMargin={10} interval={0} axisLine={false} tickLine={false} />
                                <YAxis tickFormatter={(val) => `${val}`} tick={{ fontSize: 10, fill: textColor }} axisLine={false} tickLine={false} />
                                <Tooltip content={<CustomTooltip />} cursor={{ fill: isDark ? '#374151' : '#f3f4f6' }} />
                                <Bar dataKey="count" name="Transactions" fill="#10b981" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-full w-full flex items-center justify-center text-sm font-medium text-gray-400 ml-4">
                            No data available
                        </div>
                    )}
                </div>
            </Card>

            {/* 4. Category Treemap */}
            <Card>
                <div className="mb-2">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Category Density</h3>
                    <p className="text-xs text-gray-500 font-medium">Relative size of category spending</p>
                </div>
                <div className="h-[300px] w-full">
                    {chartData.categoryData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <Treemap
                                data={chartData.categoryData}
                                dataKey="size"
                                aspectRatio={4 / 3}
                                stroke="#fff"
                                content={<CustomizedTreemapContent colors={COLORS} />}
                            >
                                <Tooltip content={<CustomTooltip />} />
                            </Treemap>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-full w-full flex items-center justify-center text-sm font-medium text-gray-400">
                            No data available
                        </div>
                    )}
                </div>
            </Card>

        </motion.div>
    );
};

export default DeepMonthAnalysis;
