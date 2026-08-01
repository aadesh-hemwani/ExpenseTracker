import { Transaction } from '../../types/analytics';

export interface DashboardMetrics {
  totalCashBalance: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  netSavings: number;
  savingsRate: number;
  categoryBreakdown: Record<string, number>;
  merchantBreakdown: Record<string, number>;
  cashFlowTrend: { month: string; income: number; expenses: number }[];
  monthlyInvestments: number;
  cumulativeBurnRate: { day: string; amount: number }[];
  fixedVsVariable: { fixed: number; variable: number };
}

export class AnalyticsCalculator {
  
  /**
   * Calculate all metrics for the dashboard from a list of transactions.
   * Assumes the transactions are already normalized (negative for expense, positive for income).
   * Transfers are ignored for income/expense calculations.
   */
  private static isExpenseCategory(category: string): boolean {
    const cat = (category || '').trim().toLowerCase();
    if (!cat) return false;
    
    // Explicitly check for known expense categories (The Practical Structure)
    const expenseCats = [
      'housing', 'food', 'transport', 'health', 'shopping', 
      'entertainment', 'subscriptions', 'education', 
      'personal care', 'financial'
    ];
    if (expenseCats.includes(cat)) return true;
    
    // Check if category name suggests refund/split (for processing positive amounts as refunds)
    if (cat.includes('refund') || cat.includes('split') || cat.includes('settle')) return true;
    
    return false;
  }

  /**
   * Calculate all metrics for the dashboard from a list of transactions.
   * Assumes the transactions are already normalized (negative for expense, positive for income).
   * Transfers are ignored for income/expense calculations.
   */
  static calculateDashboardMetrics(transactions: Transaction[], currentMonthStr: string): DashboardMetrics {
    let totalCashBalance = 0;
    let monthlyIncome = 0;
    let monthlyExpenses = 0;
    let monthlyInvestments = 0;
    
    const categoryBreakdown: Record<string, number> = {};
    const merchantBreakdown: Record<string, number> = {};
    const monthlyData: Record<string, { income: number; expenses: number }> = {};
    const dailyExpenses: Record<string, number> = {};
    const fixedVsVariable = { fixed: 0, variable: 0 };
    
    const fixedCategories = ['housing', 'utilities', 'subscriptions', 'insurance', 'debt', 'education', 'health'];

    // For total cash balance, we sum all income/expenses (or use the latest balance field if available, 
    // but a sum of all historical net flows equals current cash balance assuming it started at 0, 
    // or we can just aggregate them).
    const latestBalances: Record<string, number> = {};
    const runningTotals: Record<string, number> = {};
    const txsByAccount: Record<string, Transaction[]> = {};

    for (const tx of transactions) {
      if (!txsByAccount[tx.account_id]) txsByAccount[tx.account_id] = [];
      txsByAccount[tx.account_id].push(tx);
      runningTotals[tx.account_id] = (runningTotals[tx.account_id] || 0) + tx.amount;
    }

    // Determine the true latest balance for each account using Chain Resolution for same-day transactions
    for (const accountId of Object.keys(txsByAccount)) {
      const accountTxs = txsByAccount[accountId];
      const txsWithBalance = accountTxs.filter(t => t.balance !== undefined && t.balance !== null);
      
      if (txsWithBalance.length > 0) {
        // Find max date
        let maxDate = txsWithBalance[0].transaction_date;
        for (const t of txsWithBalance) {
          if (t.transaction_date.localeCompare(maxDate) > 0) {
            maxDate = t.transaction_date;
          }
        }

        const maxDateTxs = txsWithBalance.filter(t => t.transaction_date === maxDate);
        if (maxDateTxs.length === 1) {
          latestBalances[accountId] = maxDateTxs[0].balance!;
        } else {
          // Chain resolution: find the balance that is NOT the previous balance of any transaction today
          const balances = maxDateTxs.map(t => t.balance!);
          const prevBalances = maxDateTxs.map(t => t.balance! - t.amount);
          
          let finalBalance = maxDateTxs[0].balance!; // Fallback
          for (const bal of balances) {
            const isPrevOfSomeone = prevBalances.some(p => Math.abs(p - bal) < 0.01);
            if (!isPrevOfSomeone) {
              finalBalance = bal;
              break;
            }
          }
          latestBalances[accountId] = finalBalance;
        }
      }
    }

    // Sort for the income/expense chronological processing
    const sortedTransactions = [...transactions].sort((a, b) => {
      const dateComp = b.transaction_date.localeCompare(a.transaction_date);
      if (dateComp !== 0) return dateComp;
      if (a.created_at && b.created_at) return b.created_at.localeCompare(a.created_at);
      return 0;
    });

    for (const tx of sortedTransactions) {

      // Ignore transfers and unclassified for income/expense
      if (tx.is_transfer || tx.classification === 'transfer' || tx.classification === 'unclassified') continue;

      const txMonth = tx.transaction_date.substring(0, 7); // YYYY-MM
      
      if (!monthlyData[txMonth]) {
        monthlyData[txMonth] = { income: 0, expenses: 0 };
      }

      const cat = tx.category || 'Other';
      const merch = tx.merchant || 'Unknown';
      const cls = tx.classification;

      if (cls === 'income') {
        monthlyData[txMonth].income += tx.amount;
        if (txMonth === currentMonthStr) {
          monthlyIncome += tx.amount;
        }
      } else if (cls === 'expense') {
        const absExpense = Math.abs(tx.amount);
        monthlyData[txMonth].expenses += absExpense;
        if (txMonth === currentMonthStr) {
          monthlyExpenses += absExpense;
          categoryBreakdown[cat] = (categoryBreakdown[cat] || 0) + absExpense;
          merchantBreakdown[merch] = (merchantBreakdown[merch] || 0) + absExpense;
          
          const catLower = cat.toLowerCase();
          if (fixedCategories.some(f => catLower.includes(f))) {
            fixedVsVariable.fixed += absExpense;
          } else {
            fixedVsVariable.variable += absExpense;
          }

          const day = tx.transaction_date.substring(8, 10);
          dailyExpenses[day] = (dailyExpenses[day] || 0) + absExpense;
        }
      } else if (cls === 'investment') {
        if (txMonth === currentMonthStr) {
          monthlyInvestments += Math.abs(tx.amount);
        }
      } else if (cls === 'refund') {
        // Refund subtracts from expenses
        const absRefund = Math.abs(tx.amount);
        monthlyData[txMonth].expenses -= absRefund;
        if (txMonth === currentMonthStr) {
          monthlyExpenses -= absRefund;
          categoryBreakdown[cat] = (categoryBreakdown[cat] || 0) - absRefund;
          merchantBreakdown[merch] = (merchantBreakdown[merch] || 0) - absRefund;
          
          const catLower = cat.toLowerCase();
          if (fixedCategories.some(f => catLower.includes(f))) {
            fixedVsVariable.fixed = Math.max(0, fixedVsVariable.fixed - absRefund);
          } else {
            fixedVsVariable.variable = Math.max(0, fixedVsVariable.variable - absRefund);
          }
          
          const day = tx.transaction_date.substring(8, 10);
          dailyExpenses[day] = (dailyExpenses[day] || 0) - absRefund;
        }
      }
    }

    // Aggregate final total cash balance per account
    const allAccountIds = Object.keys(txsByAccount);
    for (const accountId of allAccountIds) {
       if (latestBalances[accountId] !== undefined) {
           totalCashBalance += latestBalances[accountId];
       } else {
           totalCashBalance += runningTotals[accountId] || 0;
       }
    }

    // Clean up category breakdown to keep only positive expense values
    const cleanedCategoryBreakdown: Record<string, number> = {};
    for (const [key, val] of Object.entries(categoryBreakdown)) {
      if (val > 0) {
        cleanedCategoryBreakdown[key] = val;
      }
    }

    // Clean up merchant breakdown to keep only positive expense values
    const cleanedMerchantBreakdown: Record<string, number> = {};
    for (const [key, val] of Object.entries(merchantBreakdown)) {
      if (val > 0) {
        cleanedMerchantBreakdown[key] = val;
      }
    }

    const netSavings = monthlyIncome - monthlyExpenses;
    const savingsRate = monthlyIncome > 0 ? (netSavings / monthlyIncome) * 100 : 0;

    const cashFlowTrend = Object.keys(monthlyData)
      .sort() // chronological
      .map(month => ({
        month,
        income: monthlyData[month].income,
        expenses: Math.max(0, monthlyData[month].expenses) // Guard against negative monthly expense in trend
      }));

    const cumulativeBurnRate: { day: string; amount: number }[] = [];
    let runningBurn = 0;
    const [yearStr, monthStr] = currentMonthStr.split('-');
    const daysInMonth = new Date(parseInt(yearStr), parseInt(monthStr), 0).getDate();
    const today = new Date();
    const isCurrentMonth = today.getFullYear() === parseInt(yearStr) && (today.getMonth() + 1) === parseInt(monthStr);
    const maxDay = isCurrentMonth ? today.getDate() : daysInMonth;

    for (let i = 1; i <= maxDay; i++) {
      const dayStr = i.toString().padStart(2, '0');
      runningBurn += (dailyExpenses[dayStr] || 0);
      cumulativeBurnRate.push({ day: dayStr, amount: Math.max(0, runningBurn) });
    }

    return {
      totalCashBalance,
      monthlyIncome,
      monthlyExpenses: Math.max(0, monthlyExpenses), // Guard against negative monthly total
      netSavings,
      savingsRate,
      categoryBreakdown: cleanedCategoryBreakdown,
      merchantBreakdown: cleanedMerchantBreakdown,
      cashFlowTrend,
      monthlyInvestments,
      cumulativeBurnRate,
      fixedVsVariable
    };
  }
}
