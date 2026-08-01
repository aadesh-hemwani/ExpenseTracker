import React, { useEffect, useState, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../context/ThemeContext';
import { BANK_CATEGORIES, CATEGORY_COLORS, getCategoryIcon } from '../../utils/uiUtils';
import { Transaction, Account } from '../../types/analytics';
import { ArrowLeft, Calendar, Landmark, ArrowUpRight, ArrowDownRight, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import Card from '../../components/Card';


export default function CategoryExplorerPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { accentColor, accentColors } = useTheme();
  
  // Selected category state from query param, default to BANK_CATEGORIES[0] ("Salary")
  const selectedCategory = searchParams.get('category') || BANK_CATEGORIES[0];

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  const itemsPerPage = 10;

  const color = accentColors[accentColor as keyof typeof accentColors]?.default || '#6366f1';

  // Fetch all transactions and accounts
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const [txsRes, accRes] = await Promise.all([
          supabase.from('transactions').select('*'),
          supabase.from('accounts').select('*')
        ]);
        if (txsRes.data) setTransactions(txsRes.data);
        if (accRes.data) setAccounts(accRes.data);
      } catch (err) {
        console.error('Error fetching explorer data:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // Map account IDs to bank names
  const accountsMap = useMemo(() => {
    return new Map<string, string>(accounts.map(a => [a.id, a.bank_name]));
  }, [accounts]);

  // Handle category tab/select change
  const handleCategoryChange = (cat: string) => {
    setSearchParams({ category: cat });
    setCurrentPage(0);
    setSearchQuery('');
  };

  // Filter transactions by selected category
  const categoryTransactions = useMemo(() => {
    return transactions
      .filter(t => (t.category || 'Other') === selectedCategory)
      .sort((a, b) => b.transaction_date.localeCompare(a.transaction_date));
  }, [transactions, selectedCategory]);

  // Apply search query filter
  const filteredTransactions = useMemo(() => {
    return categoryTransactions.filter(tx => 
      tx.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (tx.merchant && tx.merchant.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [categoryTransactions, searchQuery]);

  // Calculate summary metrics
  const metrics = useMemo(() => {
    let totalSpent = 0;
    let totalReceived = 0;
    const monthsSet = new Set<string>();

    categoryTransactions.forEach(tx => {
      monthsSet.add(tx.transaction_date.substring(0, 7));
      if (tx.amount < 0) {
        totalSpent += Math.abs(tx.amount);
      } else {
        totalReceived += tx.amount;
      }
    });

    const activeMonths = monthsSet.size || 1;
    const avgMonthlySpent = totalSpent / activeMonths;
    const avgMonthlyReceived = totalReceived / activeMonths;

    return {
      totalSpent,
      totalReceived,
      avgMonthlySpent,
      avgMonthlyReceived,
      count: categoryTransactions.length,
      monthsCount: activeMonths
    };
  }, [categoryTransactions]);

  // Monthly trend aggregates for Recharts BarChart
  const monthlyTrendData = useMemo(() => {
    const monthlyMap: Record<string, { month: string; spent: number; received: number }> = {};
    
    // Process in chronological order (oldest first)
    const chronoTxs = [...categoryTransactions].reverse();

    chronoTxs.forEach(tx => {
      const monthStr = tx.transaction_date.substring(0, 7); // YYYY-MM
      const [year, month] = monthStr.split('-');
      const dateObj = new Date(parseInt(year), parseInt(month) - 1, 1);
      const formattedMonth = dateObj.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });

      if (!monthlyMap[monthStr]) {
        monthlyMap[monthStr] = { month: formattedMonth, spent: 0, received: 0 };
      }

      if (tx.amount < 0) {
        monthlyMap[monthStr].spent += Math.abs(tx.amount);
      } else {
        monthlyMap[monthStr].received += tx.amount;
      }
    });

    return Object.keys(monthlyMap)
      .sort()
      .map(k => monthlyMap[k]);
  }, [categoryTransactions]);

  // Pagination slice
  const paginatedTransactions = useMemo(() => {
    const start = currentPage * itemsPerPage;
    return filteredTransactions.slice(start, start + itemsPerPage);
  }, [filteredTransactions, currentPage]);

  const pageCount = Math.ceil(filteredTransactions.length / itemsPerPage);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);
  };

  const selectedCatColor = CATEGORY_COLORS[selectedCategory] || '#6b7280';

  if (loading) {
    return (
      <div className="pt-20 text-center text-gray-500 font-semibold">
        Loading historical transaction database...
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-32 pt-[calc(env(safe-area-inset-top)+2rem)]">
      
      {/* Back button */}
      <button 
        onClick={() => navigate('/bank')} 
        className="flex items-center gap-2 text-gray-500 hover:text-primary transition-colors cursor-pointer"
      >
        <ArrowLeft size={16} /> Back to Dashboard
      </button>

      {/* Header and selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-primary dark:text-white flex items-center gap-2.5">
            <span className="p-2 rounded-2xl" style={{ backgroundColor: `${selectedCatColor}15`, color: selectedCatColor }}>
              {getCategoryIcon(selectedCategory, '24px', selectedCatColor)}
            </span>
            <span>Category Explorer</span>
          </h1>
          <p className="text-sm text-gray-500 mt-1">Explore transaction history, monthly trends, and averages across all accounts.</p>
        </div>

        {/* Dropdown selector */}
        <div className="relative shrink-0">
          <select
            value={selectedCategory}
            onChange={e => handleCategoryChange(e.target.value)}
            className="w-full md:w-56 bg-body border border-subtle rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 cursor-pointer text-primary dark:text-white"
            style={{ '--tw-ring-color': color } as React.CSSProperties}
          >
            {BANK_CATEGORIES.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      </div>

      {/* KPI Overview Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Metric Card */}
        <Card className="p-6 rounded-2xl flex flex-col justify-between min-h-[130px]">
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              {selectedCategory === 'Salary' || selectedCategory === 'Interest' ? (
                <><ArrowUpRight size={14} className="text-green-500" /> Total Received</>
              ) : (
                <><ArrowDownRight size={14} className="text-red-500" /> Total Spent</>
              )}
            </p>
            <p className="text-2xl font-black text-primary dark:text-white mt-1">
              {selectedCategory === 'Salary' || selectedCategory === 'Interest'
                ? formatCurrency(metrics.totalReceived)
                : formatCurrency(metrics.totalSpent)}
            </p>
          </div>
          <span className="text-[10px] text-gray-400 mt-4">
            Aggregated across {metrics.monthsCount} active {metrics.monthsCount === 1 ? 'month' : 'months'}
          </span>
        </Card>

        {/* Monthly Average Card */}
        <Card className="p-6 rounded-2xl flex flex-col justify-between min-h-[130px]">
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Monthly Average</p>
            <p className="text-2xl font-black text-primary dark:text-white mt-1">
              {selectedCategory === 'Salary' || selectedCategory === 'Interest'
                ? formatCurrency(metrics.avgMonthlyReceived)
                : formatCurrency(metrics.avgMonthlySpent)}
            </p>
          </div>
          <span className="text-[10px] text-gray-400 mt-4">Average monthly run rate</span>
        </Card>

        {/* Transaction Count Card */}
        <Card className="p-6 rounded-2xl flex flex-col justify-between min-h-[130px]">
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Transaction Count</p>
            <p className="text-2xl font-black text-primary dark:text-white mt-1">
              {metrics.count} {metrics.count === 1 ? 'txn' : 'txns'}
            </p>
          </div>
          <span className="text-[10px] text-gray-400 mt-4">Historical record volume</span>
        </Card>
      </div>

      {/* Monthly Trend Chart */}
      {monthlyTrendData.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider ml-1">Monthly Spending Trend</h3>
          <Card className="p-6 rounded-2xl shadow-sm">
            <div className="h-64 -ml-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyTrendData}>
                  <XAxis dataKey="month" stroke="#888888" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#888888" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(val) => `₹${val / 1000}k`} />
                  <RechartsTooltip 
                    cursor={{ fill: 'rgba(0,0,0,0.02)' }} 
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} 
                    formatter={(val: number) => formatCurrency(val)} 
                  />
                  <Bar 
                    dataKey={selectedCategory === 'Salary' || selectedCategory === 'Interest' ? 'received' : 'spent'} 
                    fill={selectedCatColor} 
                    radius={[4, 4, 0, 0]} 
                    barSize={32} 
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      )}

      {/* Detailed Transaction List */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider ml-1">Historical Transactions Log</h3>
        
        <Card className="p-6 rounded-2xl shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div className="relative w-full sm:max-w-xs">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search descriptions..."
                value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); setCurrentPage(0); }}
                className="w-full bg-body border border-subtle rounded-xl pl-9 pr-4 py-2 text-xs focus:outline-none focus:ring-2"
                style={{ '--tw-ring-color': color } as React.CSSProperties}
              />
            </div>
          </div>

          {/* Table list */}
          <div className="overflow-x-auto no-scrollbar">
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-800">
                  <th className="pb-3 pr-4 font-bold text-xs text-gray-400 uppercase tracking-wider w-[120px]">Date</th>
                  <th className="pb-3 pr-4 font-bold text-xs text-gray-400 uppercase tracking-wider">Description</th>
                  <th className="pb-3 pr-4 font-bold text-xs text-gray-400 uppercase tracking-wider w-[150px]">Account</th>
                  <th className="pb-3 pr-4 font-bold text-xs text-gray-400 uppercase tracking-wider text-right w-[120px]">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800/40">
                {paginatedTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-10 text-center text-sm text-gray-500">
                      No transactions found for the selected category filters.
                    </td>
                  </tr>
                ) : (
                  paginatedTransactions.map(tx => {
                    const accountName = accountsMap.get(tx.account_id) || 'Unknown Bank';
                    return (
                      <tr key={tx.id} className="hover:bg-black/[0.005] dark:hover:bg-white/[0.005] transition-colors duration-150">
                        <td className="py-3.5 pr-4 text-xs font-mono text-gray-500 dark:text-gray-400 whitespace-nowrap align-middle">
                          {tx.transaction_date}
                        </td>
                        <td className="py-3.5 pr-4 align-middle">
                          <div className="font-semibold text-primary dark:text-white truncate max-w-[300px]" title={tx.merchant || tx.description}>
                            {tx.merchant || tx.description}
                          </div>
                          {tx.merchant && tx.description !== tx.merchant && (
                            <div className="text-[10px] text-gray-400 font-mono truncate max-w-[300px]" title={tx.description}>
                              {tx.description}
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 pr-4 text-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap align-middle">
                          <div className="flex items-center gap-1.5">
                            <Landmark size={12} className="text-gray-400" />
                            <span>{accountName}</span>
                          </div>
                        </td>
                        <td className="py-3.5 pr-4 text-right align-middle">
                          <div className={`font-mono font-bold text-sm whitespace-nowrap ${tx.amount < 0 ? 'text-red-500 dark:text-red-400' : 'text-green-500 dark:text-green-400'}`}>
                            {tx.amount < 0 ? '-' : '+'}₹{Math.abs(tx.amount).toLocaleString('en-IN')}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination controls */}
          {pageCount > 1 && (
            <div className="flex items-center justify-between border-t border-gray-200 dark:border-gray-800 pt-4 mt-4">
              <span className="text-xs text-gray-500 font-medium">
                Page {currentPage + 1} of {pageCount} ({filteredTransactions.length} items)
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
                  disabled={currentPage === 0}
                  className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 transition-colors cursor-pointer"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(pageCount - 1, prev + 1))}
                  disabled={currentPage === pageCount - 1}
                  className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 transition-colors cursor-pointer"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
