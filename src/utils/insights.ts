import { endOfMonth, differenceInDays } from 'date-fns';
import { TrendingUp, TrendingDown, Target, Sparkles, PieChart, AlertTriangle, LucideIcon, CheckCircle } from 'lucide-react';
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
    const daysInMonth = endOfMonth(today).getDate();
    const dayOfMonth = today.getDate();
    const daysRemaining = daysInMonth - dayOfMonth + 1;

    // Helper to find top category
    const getTopCategory = () => {
        if (monthlyExpenses.length === 0) return null;
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
        return { name: topCat, value: maxVal };
    };

    const topCategory = getTopCategory();

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
                text: `You've exceeded your budget by ₹${Math.abs(remaining).toLocaleString()}. Review your ${topCategory?.name || 'recent'} expenses immediately.`,
                color: 'text-red-600 dark:text-red-400',
                bg: 'bg-red-50 dark:bg-red-500/10'
            });
        }
        else if (percentageUsed >= 0.85) {
            // Actionable: How much to save per day?
            // If they are on track to exceed, warn them.
            // Or just generic "Reduce by X"
            // Let's enable "Reduce X by Y"
            
            // Just calculated "available per day" vs "current burn rate"? 
            // Simpler: "Reduce by ₹X/day to stay within budget."
            
            // remaining / daysRemaining
            const dailyBudgetLeft = remaining / daysRemaining;
            
            insights.push({
                id: 'budget-warning',
                priority: 1,
                icon: AlertTriangle,
                title: 'Budget Alert',
                text: `You have ₹${remaining.toLocaleString()} left. Limit spending to ₹${Math.round(dailyBudgetLeft).toLocaleString()}/day to stay on track.`,
                color: 'text-orange-600 dark:text-orange-400',
                bg: 'bg-orange-50 dark:bg-orange-500/10'
            });
        }
    }

    // --------------------------------------------------------------------------
    // 2. FORECASTING (Priority: 3 - Actionable)
    // --------------------------------------------------------------------------
    if (dayOfMonth > 5) { // Need some data
        const dailyAverage = currentMonthTotal / dayOfMonth;
        const projectedTotal = dailyAverage * daysInMonth; // Simple linear projection
        
        if (budget > 0 && projectedTotal > budget) {
             const excess = projectedTotal - budget;
             // Actionable advice
             const reduceAmount = Math.round(excess / daysRemaining);
             
             insights.push({
                id: 'forecast-exceed',
                priority: 2,
                icon: TrendingUp,
                title: 'Pace Warning',
                text: `At this pace, you'll exceed budget by ₹${Math.round(excess).toLocaleString()}. Reduce ${topCategory?.name ? topCategory.name : 'spending'} by ₹${reduceAmount}/day.`,
                color: 'text-amber-600 dark:text-amber-400',
                bg: 'bg-amber-50 dark:bg-amber-500/10'
            });
        } else if (projectedTotal > 1000) {
            // Just informational if no budget or under budget
             insights.push({
                id: 'forecast-info',
                priority: 4,
                icon: Target,
                title: 'Forecast',
                text: `On track to spend ≈₹${Math.round(projectedTotal / 100) * 100} by month end.`,
                color: 'text-blue-600 dark:text-blue-400',
                bg: 'bg-blue-50 dark:bg-blue-500/10'
            });
        }
    }

    // --------------------------------------------------------------------------
    // 3. CATEGORY DOMINANCE (Priority: 3 - Actionable)
    // --------------------------------------------------------------------------
    if (topCategory && monthlyExpenses.length > 5) {
         if ((topCategory.value / currentMonthTotal) > 0.50) {
            insights.push({
                id: 'top-cat',
                priority: 3,
                icon: PieChart,
                title: 'Spending Pattern',
                text: `${topCategory.name} makes up ${Math.round((topCategory.value / currentMonthTotal) * 100)}% of costs. Consider setting a limit for this category.`,
                color: 'text-purple-600 dark:text-purple-400',
                bg: 'bg-purple-50 dark:bg-purple-500/10'
            });
        }
    }

    // --------------------------------------------------------------------------
    // 4. SAVINGS SUCCESS (Priority: 5 - Positive)
    // --------------------------------------------------------------------------
    if (stats.length > 2 && dayOfMonth > 15) {
        const avgSpend = stats.reduce((acc, s) => acc + Number(s.total), 0) / stats.length;
        if (currentMonthTotal < avgSpend * 0.9) { // 10% less
             // Project it
            const projected = (currentMonthTotal / dayOfMonth) * daysInMonth;
            if (projected < avgSpend) {
                const savings = avgSpend - projected;
                insights.push({
                    id: 'low-spend',
                    priority: 5,
                    icon: CheckCircle,
                    title: 'Great Job',
                    text: `You're on track to save ₹${Math.round(savings).toLocaleString()} compared to your average month!`,
                    color: 'text-emerald-600 dark:text-emerald-400',
                    bg: 'bg-emerald-50 dark:bg-emerald-500/10'
                });
            }
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
            title: 'Insights',
            text: "Your spending is balanced. Continue tracking to get smarter recommendations.",
            color: 'text-indigo-600 dark:text-indigo-400',
            bg: 'bg-indigo-50 dark:bg-indigo-500/10'
        });
    }

    // Sort by priority (Lowest number = Highest Priority)
    return insights.sort((a, b) => a.priority - b.priority);
};
