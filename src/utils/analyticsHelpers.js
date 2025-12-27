import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';

export const processMonthlyData = (expenses) => {
  const last6Months = [];
  const today = new Date();

  // 1. Generate labels for the last 6 months
  for (let i = 5; i >= 0; i--) {
    const date = subMonths(today, i);
    const monthKey = format(date, 'MMM'); // e.g., "Jan", "Feb"
    
    // 2. Filter expenses for this specific month
    const monthlyExpenses = expenses.filter(expense => {
      if (!expense.date) return false;
      return isWithinInterval(expense.date, {
        start: startOfMonth(date),
        end: endOfMonth(date)
      });
    });

    // 3. Sum up the amount
    const total = monthlyExpenses.reduce((sum, item) => sum + item.amount, 0);

    last6Months.push({
      name: monthKey,
      total: total,
      rawDate: date // keep for sorting/key if needed
    });
  }

  return last6Months;
};

export const getCategoryBreakdown = (expenses) => {
  const categories = {};
  
  expenses.forEach(exp => {
    if (!categories[exp.category]) categories[exp.category] = 0;
    categories[exp.category] += exp.amount;
  });

  // Convert to array and sort by amount descending
  return Object.entries(categories)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
};