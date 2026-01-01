import { endOfMonth } from 'date-fns';
import { TrendingUp, TrendingDown, Target, Sparkles, PieChart, AlertTriangle, LucideIcon } from 'lucide-react';
import { Expense } from '../types';
import { MonthlyData } from './analyticsHelpers';

export interface Insight {
    id: string;
    priority: number;
    icon: LucideIcon;
    title: string;
    text: string;
    color: string;
    bg: string;
}

export const generateInsights = (stats: MonthlyData[], monthlyExpenses: Expense[], currentMonthTotal: number, budget: number): Insight[] => {
    // List to hold all potential insights
    const insights: Insight[] = [];
    const today = new Date();

    // --------------------------------------------------------------------------
    // 1. BUDGET ALERT (Priority: 1 - Critical)
    // --------------------------------------------------------------------------
    if (budget > 0) {
        const percentageUsed = (currentMonthTotal / budget);
        const remaining = budget - currentMonthTotal;

        if (percentageUsed >= 1.0) {
            insights.push({
                id: 'budget-exceeded',
                priority: 1,
                icon: AlertTriangle,
                title: 'Budget Exceeded',
                text: `You've exceeded your budget by ₹${Math.abs(remaining)}.`,
                color: 'text-red-500',
                bg: 'bg-red-500/10'
            });
        }
        else if (percentageUsed >= 0.90) {
            insights.push({
                id: 'budget-warning',
                priority: 1,
                icon: AlertTriangle,
                title: 'Budget Alert',
                text: `Critical! You've used ${Math.round(percentageUsed * 100)}% of your budget. Only ₹${remaining} left.`,
                color: 'text-orange-600',
                bg: 'bg-orange-500/10'
            });
        }
    }

    // --------------------------------------------------------------------------
    // 2. HIGH SPENDING ANOMALY (Priority: 2 - Warning)
    // --------------------------------------------------------------------------
    if (stats.length > 2) {
        const avgSpend = stats.reduce((acc, s) => acc + Number(s.total), 0) / stats.length;

        if (currentMonthTotal > avgSpend * 1.2) {
            insights.push({
                id: 'high-spend',
                priority: 2,
                icon: TrendingUp,
                title: 'High Spending',
                text: `Spending is 20% higher than your average month.`,
                color: 'text-orange-500',
                bg: 'bg-orange-500/10'
            });
        }
    }

    // --------------------------------------------------------------------------
    // 3. FORECASTING (Priority: 3 - Informational)
    // --------------------------------------------------------------------------
    const dayOfMonth = today.getDate();
    if (dayOfMonth > 3) {
        const dailyAverage = currentMonthTotal / dayOfMonth;
        const daysInMonth = endOfMonth(today).getDate();
        const projectedTotal = dailyAverage * daysInMonth; // Simple linear projection

        // Only show if projection is significant enough to care about (> 1000)
        if (projectedTotal > 1000) {
            insights.push({
                id: 'forecast',
                priority: 3,
                icon: Target,
                title: 'Projected Spend',
                text: `On track to spend ≈₹${Math.round(projectedTotal / 100) * 100} by month end.`,
                color: 'text-blue-500',
                bg: 'bg-blue-500/10'
            });
        }
    }

    // --------------------------------------------------------------------------
    // 4. CATEGORY DOMINANCE (Priority: 4 - Informational)
    // --------------------------------------------------------------------------
    if (monthlyExpenses.length > 0) {
        const categoryTotals: Record<string, number> = {};
        monthlyExpenses.forEach(e => {
            categoryTotals[e.category] = (categoryTotals[e.category] || 0) + Number(e.amount);
        });

        let topCat: string | null = null;
        let maxVal = 0;
        Object.entries(categoryTotals).forEach(([cat, val]) => {
            if (val > maxVal) {
                maxVal = val;
                topCat = cat;
            }
        });

        if (topCat && (maxVal / currentMonthTotal) > 0.45) {
            insights.push({
                id: 'top-cat',
                priority: 4,
                icon: PieChart,
                title: 'Top Category',
                text: `${topCat} consumes ${Math.round((maxVal / currentMonthTotal) * 100)}% of your total spending.`,
                color: 'text-purple-500',
                bg: 'bg-purple-500/10'
            });
        }
    }

    // --------------------------------------------------------------------------
    // 5. SAVINGS SUCCESS (Priority: 5 - Positive)
    // --------------------------------------------------------------------------
    if (stats.length > 2 && dayOfMonth > 20) {
        const avgSpend = stats.reduce((acc, s) => acc + Number(s.total), 0) / stats.length;
        if (currentMonthTotal < avgSpend * 0.8) {
            insights.push({
                id: 'low-spend',
                priority: 5,
                icon: TrendingDown,
                title: 'Smart Saving',
                text: `Great job! You are spending 20% less than usual.`,
                color: 'text-green-500',
                bg: 'bg-green-500/10'
            });
        }
    }

    // --------------------------------------------------------------------------
    // FALLBACK
    // --------------------------------------------------------------------------
    if (insights.length === 0) {
        insights.push({
            id: 'generic',
            priority: 99,
            icon: Sparkles,
            title: 'AI Analysis',
            text: "Spending looks normal. Keep tracking to unlock more insights!",
            color: 'text-indigo-500',
            bg: 'bg-indigo-500/10'
        });
    }

    // Sort by priority (Lowest number = Highest Priority)
    return insights.sort((a, b) => a.priority - b.priority);
};
