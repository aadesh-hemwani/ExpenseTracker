import React, { useMemo, memo } from "react";
import { Expense } from "../types";
import Card from "./Card";
import { TrendingUp, Activity, Calendar, PieChart } from "lucide-react";
import { motion } from "framer-motion";
import { Timestamp } from "firebase/firestore";

interface MonthInsightsProps {
    expenses: Expense[];
    currentMonth: Date;
}

const MonthInsights = memo(({ expenses, currentMonth }: MonthInsightsProps) => {
    const insights = useMemo(() => {
        if (!expenses.length) return null;

        const totalSpend = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

        const ranges = { micro: 0, small: 0, medium: 0, large: 0 };
        expenses.forEach((e) => {
            const amt = Number(e.amount);
            if (amt <= 100) ranges.micro++;
            else if (amt <= 500) ranges.small++;
            else if (amt <= 1000) ranges.medium++;
            else ranges.large++;
        });

        const rangePercentages = {
            micro: Math.round((ranges.micro / expenses.length) * 100) || 0,
            small: Math.round((ranges.small / expenses.length) * 100) || 0,
            medium: Math.round((ranges.medium / expenses.length) * 100) || 0,
            large: Math.round((ranges.large / expenses.length) * 100) || 0,
        };

        const today = new Date();
        let daysPassed = 1;
        if (
            currentMonth.getFullYear() === today.getFullYear() &&
            currentMonth.getMonth() === today.getMonth()
        ) {
            daysPassed = today.getDate();
        } else {
            daysPassed = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
        }

        const dailyAverage = totalSpend / daysPassed;
        const totalDaysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
        const projectedTotal = dailyAverage * totalDaysInMonth;

        const daysOfWeek = [0, 0, 0, 0, 0, 0, 0];
        const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        expenses.forEach((e) => {
            let d: Date;
            if (e.date instanceof Date) {
                d = e.date;
            } else if (e.date instanceof Timestamp) {
                d = e.date.toDate();
            } else {
                d = new Date(e.date as any);
            }
            daysOfWeek[d.getDay()] += Number(e.amount);
        });

        const maxDayAmount = Math.max(...daysOfWeek);
        const busiestDayIndex = daysOfWeek.indexOf(maxDayAmount);
        const busiestDayName = dayNames[busiestDayIndex];

        const categoryTotals: Record<string, number> = {};
        expenses.forEach((e) => {
            categoryTotals[e.category] = (categoryTotals[e.category] || 0) + Number(e.amount);
        });
        const topCategoryEntry = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0];
        const topCategoryPercent = topCategoryEntry ? Math.round((topCategoryEntry[1] / totalSpend) * 100) : 0;

        return {
            totalSpend,
            ranges,
            rangePercentages,
            dailyAverage,
            projectedTotal,
            busiestDayName,
            maxDayAmount,
            topCategory: topCategoryEntry ? topCategoryEntry[0] : null,
            topCategoryPercent,
        };
    }, [expenses, currentMonth]);

    if (!insights) return null;

    return (
        <div className="mb-8 -mx-5 md:mx-0">
            <div className="flex overflow-x-auto gap-4 pb-4 px-5 md:px-0 snap-x snap-mandatory no-scrollbar text-sm after:content-[''] after:w-4 after:shrink-0 md:after:hidden">

                <Card className="min-w-[240px] snap-center shrink-0 flex flex-col justify-between">
                    <div className="flex items-center gap-2 text-blue-500 mb-3">
                        <Activity size={18} />
                        <h4 className="font-bold">Daily Velocity</h4>
                    </div>
                    <div>
                        <div className="flex justify-between items-end mb-1">
                            <span className="text-xs text-gray-500 font-medium">Daily Avg</span>
                            <span className="font-bold text-lg text-gray-900 dark:text-white">₹{Math.round(insights.dailyAverage).toLocaleString('en-IN')}</span>
                        </div>
                        <div className="flex justify-between items-end">
                            <span className="text-xs text-gray-500 font-medium">Projected End</span>
                            <span className="font-bold text-gray-400">₹{Math.round(insights.projectedTotal).toLocaleString('en-IN')}</span>
                        </div>
                    </div>
                </Card>

                <Card className="min-w-[280px] snap-center shrink-0">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2 text-indigo-500">
                            <PieChart size={18} />
                            <h4 className="font-bold">Spend Limits</h4>
                        </div>
                        <span className="text-xs text-gray-500 font-medium">{expenses.length} Txns</span>
                    </div>

                    <div className="space-y-3">
                        <div className="flex items-center gap-2">
                            <div className="w-14 text-xs font-semibold text-gray-500 shrink-0">₹0-100</div>
                            <div className="flex-1 bg-gray-100 dark:bg-white/5 h-2 rounded-full overflow-hidden">
                                <motion.div initial={{ width: 0 }} animate={{ width: `${insights.rangePercentages.micro}%` }} className="h-full bg-indigo-400 rounded-full" />
                            </div>
                            <div className="w-8 text-[10px] text-right font-bold">{insights.rangePercentages.micro}%</div>
                        </div>

                        <div className="flex items-center gap-2">
                            <div className="w-14 text-[10px] font-semibold text-gray-500 shrink-0">₹100-500</div>
                            <div className="flex-1 bg-gray-100 dark:bg-white/5 h-2 rounded-full overflow-hidden">
                                <motion.div initial={{ width: 0 }} animate={{ width: `${insights.rangePercentages.small}%` }} className="h-full bg-indigo-500 rounded-full" />
                            </div>
                            <div className="w-8 text-[10px] text-right font-bold">{insights.rangePercentages.small}%</div>
                        </div>

                        <div className="flex items-center gap-2">
                            <div className="w-14 text-[10px] font-semibold text-gray-500 shrink-0">₹500-1K</div>
                            <div className="flex-1 bg-gray-100 dark:bg-white/5 h-2 rounded-full overflow-hidden">
                                <motion.div initial={{ width: 0 }} animate={{ width: `${insights.rangePercentages.medium}%` }} className="h-full bg-indigo-600 rounded-full" />
                            </div>
                            <div className="w-8 text-[10px] text-right font-bold">{insights.rangePercentages.medium}%</div>
                        </div>

                        <div className="flex items-center gap-2">
                            <div className="w-14 text-[10px] font-semibold text-gray-500 shrink-0">₹1K+</div>
                            <div className="flex-1 bg-gray-100 dark:bg-white/5 h-2 rounded-full overflow-hidden">
                                <motion.div initial={{ width: 0 }} animate={{ width: `${insights.rangePercentages.large}%` }} className="h-full bg-red-400 rounded-full" />
                            </div>
                            <div className="w-8 text-[10px] text-right font-bold text-red-500">{insights.rangePercentages.large}%</div>
                        </div>
                    </div>
                </Card>

                <Card className="min-w-[200px] snap-center shrink-0 flex flex-col justify-between">
                    <div className="flex items-center gap-2 text-yellow-500 mb-3">
                        <Calendar size={18} />
                        <h4 className="font-bold">Busiest Day</h4>
                    </div>
                    <div>
                        <p className="text-3xl font-black tracking-tighter text-gray-900 dark:text-white mb-1">
                            {insights.busiestDayName}s
                        </p>
                        <p className="text-xs text-gray-500 font-medium leading-tight">
                            You usually spend the most on {insights.busiestDayName}s (₹{Math.round(insights.maxDayAmount).toLocaleString('en-IN')}).
                        </p>
                    </div>
                </Card>

                <Card className="min-w-[200px] snap-center shrink-0 flex flex-col justify-between">
                    <div className="flex items-center gap-2 text-orange-500 mb-3">
                        <TrendingUp size={18} />
                        <h4 className="font-bold">Top Offender</h4>
                    </div>
                    <div>
                        <p className="text-2xl font-black tracking-tight text-gray-900 dark:text-white mb-1 truncate">
                            {insights.topCategory || "None"}
                        </p>
                        <p className="text-xs text-gray-500 font-medium leading-tight">
                            Makes up <strong className="text-orange-500">{insights.topCategoryPercent}%</strong> of your entire monthly spend.
                        </p>
                    </div>
                </Card>

            </div>
        </div>
    );
});

MonthInsights.displayName = "MonthInsights";

export default MonthInsights;
