import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { Expense } from '../types';
import { Timestamp } from 'firebase/firestore';

export interface MonthlyData {
    name: string;
    total: number;
    rawDate: Date;
}

export interface CategoryBreakdown {
    name: string;
    value: number;
}

export const processMonthlyData = (expenses: Expense[]): MonthlyData[] => {
    const last6Months: MonthlyData[] = [];
    const today = new Date();

    // 1. Generate labels for the last 6 months
    for (let i = 5; i >= 0; i--) {
        const date = subMonths(today, i);
        const monthKey = format(date, 'MMM'); // e.g., "Jan", "Feb"

        // 2. Filter expenses for this specific month
        const monthlyExpenses = expenses.filter(expense => {
            // Handle both Firestore Timestamp and JS Date
            let expenseDate: Date;
            if (expense.date instanceof Timestamp) {
                expenseDate = expense.date.toDate();
            } else if (expense.date instanceof Date) {
                expenseDate = expense.date;
            } else {
                return false;
            }

            return isWithinInterval(expenseDate, {
                start: startOfMonth(date),
                end: endOfMonth(date)
            });
        });

        // 3. Sum up the amount
        const total = monthlyExpenses.reduce((sum, item) => sum + Number(item.amount), 0);

        last6Months.push({
            name: monthKey,
            total: total,
            rawDate: date // keep for sorting/key if needed
        });
    }

    return last6Months;
};

export const getCategoryBreakdown = (expenses: Expense[]): CategoryBreakdown[] => {
    const categories: Record<string, number> = {};

    expenses.forEach(exp => {
        if (!categories[exp.category]) categories[exp.category] = 0;
        categories[exp.category] += Number(exp.amount);
    });

    // Convert to array and sort by amount descending
    return Object.entries(categories)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);
};
