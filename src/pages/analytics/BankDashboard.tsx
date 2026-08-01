import React, { useEffect, useMemo, useState, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { AnalyticsCalculator, DashboardMetrics } from '../../services/analytics/AnalyticsCalculator';
import { useTheme } from '../../context/ThemeContext';
import { LineChart, Line, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';
import { Landmark, ArrowUpRight, ArrowDownRight, Wallet, Sliders, ChevronLeft, ChevronRight, RefreshCw, ArrowUp, ArrowDown, MoreHorizontal, FileText, ArrowUpDown, Compass } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getCategoryIcon, CATEGORY_COLORS } from '../../utils/uiUtils';
import { getCleanDescription } from '../../utils/statementParserUtils';
import Card from '../../components/Card';


import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  createColumnHelper,
  SortingState,
  ColumnFiltersState,
  VisibilityState,
} from '@tanstack/react-table';

export default function BankDashboard() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [availableMonths, setAvailableMonths] = useState<string[]>([]);
  const [selectedMonth, setSelectedMonth] = useState('');
  const [unmappedCount, setUnmappedCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [selectedAccountFilter, setSelectedAccountFilter] = useState<string>('all');
  const [accountsList, setAccountsList] = useState<any[]>([]);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [categoryType, setCategoryType] = useState<'expense' | 'income'>('expense');
  
  // Table State
  const [sorting, setSorting] = useState<SortingState>([{ id: 'transaction_date', desc: true }]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({ description: false });

  // Menu State
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [columnsMenuOpen, setColumnsMenuOpen] = useState(false);
  const columnsMenuRef = useRef<HTMLDivElement>(null);

  const { accentColor, accentColors } = useTheme();
  const navigate = useNavigate();
  const color = accentColors[accentColor as keyof typeof accentColors]?.default || '#6366f1';

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
      if (columnsMenuRef.current && !columnsMenuRef.current.contains(event.target as Node)) {
        setColumnsMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [txsRes, merchRes, catRes, accRes] = await Promise.all([
        supabase.from('transactions').select('*'),
        supabase.from('merchant_rules').select('*'),
        supabase.from('category_rules').select('*'),
        supabase.from('accounts').select('*')
      ]);

      if (accRes.data) setAccountsList(accRes.data);

      if (txsRes.data) {
        const txs = txsRes.data;
        const merchantRules = merchRes.data || [];
        const categoryRules = catRes.data || [];

        const monthsSet = new Set<string>();
        txs.forEach(tx => {
          const m = tx.transaction_date.substring(0, 7);
          monthsSet.add(m);
        });
        const sortedMonths = Array.from(monthsSet).sort().reverse();
        setAvailableMonths(sortedMonths);

        const calendarMonth = new Date().toISOString().substring(0, 7);
        let defaultMonth = calendarMonth;
        if (sortedMonths.length > 0) {
          defaultMonth = monthsSet.has(calendarMonth) ? calendarMonth : sortedMonths[0];
        }

        setSelectedMonth(defaultMonth);
        setTransactions(txs);

        const computed = AnalyticsCalculator.calculateDashboardMetrics(txs, defaultMonth);
        setMetrics(computed);

        let unmappedTxCount = 0;
        const groups: Record<string, any[]> = {};
        txs.forEach(tx => {
          const m = tx.merchant || 'Unknown';
          if (!groups[m]) groups[m] = [];
          groups[m].push(tx);
        });

        Object.entries(groups).forEach(([merchantName, txList]) => {
          const hasM = merchantRules.some(r => {
            try { return new RegExp(r.pattern, 'i').test(merchantName) || txList.some(tx => new RegExp(r.pattern, 'i').test(tx.description)); } catch { return false; }
          });
          const hasC = categoryRules.some(r => {
            try { return new RegExp(r.pattern, 'i').test(merchantName); } catch { return false; }
          });
          const isOtherCategory = txList.every(tx => tx.category === 'Other' || !tx.category);

          if (!hasM || !hasC || isOtherCategory) {
            unmappedTxCount += txList.length;
          }
        });
        setUnmappedCount(unmappedTxCount);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleMonthChange = (month: string) => {
    setSelectedMonth(month);
    const computed = AnalyticsCalculator.calculateDashboardMetrics(transactions, month);
    setMetrics(computed);
  };

  const handleClassificationChange = async (txId: string, newClass: string) => {
    const targetTx = transactions.find(t => t.id === txId);
    const updatedTxs = transactions.map(t => t.id === txId ? { ...t, classification: newClass } : t);
    setTransactions(updatedTxs);
    
    const computed = AnalyticsCalculator.calculateDashboardMetrics(updatedTxs, selectedMonth);
    setMetrics(computed);

    try {
      const { error: txError } = await supabase.from('transactions').update({ classification: newClass }).eq('id', txId);
      if (txError) throw txError;

      if (targetTx && targetTx.merchant && targetTx.merchant !== 'Unknown' && newClass !== 'unclassified') {
        const direction = targetTx.amount < 0 ? 'dr' : 'cr';
        const { error: learningError } = await supabase.from('classification_learning').upsert({
          merchant: targetTx.merchant, direction, classification: newClass, updated_at: new Date().toISOString()
        }, { onConflict: 'merchant,direction' });
        
        if (learningError) console.warn('Failed to update classification_learning:', learningError);
      }
    } catch (err) {
      console.error('Failed to update classification:', err);
    }
  };

  const handleRerunMapping = async () => {
    setSyncing(true);
    try {
      const [merchRes, catRes, txsRes] = await Promise.all([
        supabase.from('merchant_rules').select('*'),
        supabase.from('category_rules').select('*'),
        supabase.from('transactions').select('*')
      ]);

      const merchantRules = merchRes.data || [];
      const categoryRules = catRes.data || [];
      const txs = txsRes.data || [];

      if (txs.length === 0) return alert("No transactions found to sync.");

      const updates: { id: string; merchant: string; category: string }[] = [];

      txs.forEach(tx => {
        const defaultMerchant = getCleanDescription(tx.description);
        let normalizedMerchant = defaultMerchant;

        let matchedRule = false;
        for (const rule of merchantRules) {
          try {
            if (new RegExp(rule.pattern, 'i').test(tx.description)) {
              normalizedMerchant = rule.normalized_merchant;
              matchedRule = true;
              break;
            }
          } catch {}
        }
        if (!matchedRule && defaultMerchant !== tx.description) {
          for (const rule of merchantRules) {
            try {
              if (new RegExp(rule.pattern, 'i').test(defaultMerchant)) {
                normalizedMerchant = rule.normalized_merchant;
                break;
              }
            } catch {}
          }
        }

        let assignedCategory = 'Other';
        for (const rule of categoryRules) {
          try {
            if (new RegExp(rule.pattern, 'i').test(normalizedMerchant)) {
              assignedCategory = rule.category;
              break;
            }
          } catch {}
        }

        if (normalizedMerchant !== tx.merchant || assignedCategory !== tx.category) {
          updates.push({ id: tx.id, merchant: normalizedMerchant, category: assignedCategory });
        }
      });

      if (updates.length > 0) {
        await Promise.all(updates.map(upd => 
          supabase.from('transactions').update({ merchant: upd.merchant, category: upd.category }).eq('id', upd.id)
        ));
      }

      await fetchData();
      alert(`Sync completed successfully! Re-mapped ${updates.length} transactions.`);
    } catch (err) {
      console.error('Error running mapping sync:', err);
      alert('Failed to sync rules. Please try again.');
    } finally {
      setSyncing(false);
    }
  };

  const categoriesForSelectedMonth = useMemo(() => {
    const cats = new Set<string>();
    transactions.filter(t => t.transaction_date.substring(0, 7) === selectedMonth).forEach(t => cats.add(t.category || 'Other'));
    return Array.from(cats).sort();
  }, [transactions, selectedMonth]);

  const tableData = useMemo(() => {
    return transactions
      .filter(t => t.transaction_date.substring(0, 7) === selectedMonth)
      .filter(t => selectedAccountFilter === 'all' || t.account_id === selectedAccountFilter);
  }, [transactions, selectedMonth, selectedAccountFilter]);

  const categoryBreakdowns = useMemo(() => {
    const expenseBreakdown: Record<string, number> = {};
    const incomeBreakdown: Record<string, number> = {};
    let totalExpenses = 0;
    let totalIncome = 0;

    tableData.forEach(tx => {
      const cls = tx.classification;
      const cat = tx.category || 'Other';
      const amt = Math.abs(tx.amount);

      if (cls === 'expense') {
        expenseBreakdown[cat] = (expenseBreakdown[cat] || 0) + amt;
        totalExpenses += amt;
      } else if (cls === 'refund') {
        expenseBreakdown[cat] = (expenseBreakdown[cat] || 0) - amt;
        totalExpenses -= amt;
      } else if (cls === 'income') {
        incomeBreakdown[cat] = (incomeBreakdown[cat] || 0) + amt;
        totalIncome += amt;
      }
    });

    const cleanExpenses: Record<string, number> = {};
    Object.entries(expenseBreakdown).forEach(([k, v]) => {
      if (v > 0) cleanExpenses[k] = v;
    });

    const cleanIncome: Record<string, number> = {};
    Object.entries(incomeBreakdown).forEach(([k, v]) => {
      if (v > 0) cleanIncome[k] = v;
    });

    return {
      expense: {
        breakdown: cleanExpenses,
        total: Math.max(0, totalExpenses)
      },
      income: {
        breakdown: cleanIncome,
        total: Math.max(0, totalIncome)
      }
    };
  }, [tableData]);

  const columnHelper = createColumnHelper<any>();

  const columns = useMemo(() => [
    columnHelper.accessor('transaction_date', {
      header: ({ column }) => (
        <div className="flex items-center gap-1 cursor-pointer group hover:text-primary dark:hover:text-white transition-colors select-none w-[100px]" onClick={column.getToggleSortingHandler()}>
          Date
          {{
            asc: <ArrowUp size={14} />,
            desc: <ArrowDown size={14} />,
          }[column.getIsSorted() as string] ?? <ArrowUpDown size={14} className="opacity-0 group-hover:opacity-50" />}
        </div>
      ),
      cell: info => <span className="font-mono text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">{info.getValue()}</span>,
    }),
    columnHelper.accessor('merchant', {
      header: 'Description',
      cell: info => <div className="font-semibold text-primary dark:text-white truncate max-w-[240px] sm:max-w-none" title={info.getValue() || 'Unknown'}>{info.getValue() || 'Unknown'}</div>,
    }),
    columnHelper.accessor('description', {
      header: 'Raw Description',
      cell: info => <div className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[240px] sm:max-w-none" title={info.getValue() || ''}>{info.getValue() || ''}</div>,
    }),
    columnHelper.accessor(row => row.category || 'Other', {
      id: 'category',
      header: ({ column }) => (
        <div className="flex flex-col gap-1.5 w-[140px]">
          <span className="select-none text-xs">Category</span>
          <select 
            value={(column.getFilterValue() ?? '') as string}
            onChange={e => column.setFilterValue(e.target.value)}
            className="text-xs bg-transparent border-b border-gray-300 dark:border-gray-700 py-0.5 focus:outline-none focus:border-primary appearance-none cursor-pointer text-gray-500 dark:text-gray-400"
          >
            <option value="">All</option>
            {categoriesForSelectedMonth.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      ),
      cell: info => {
        const cat = info.getValue() as string;
        const catColor = CATEGORY_COLORS[cat] || '#6b7280';
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap" style={{ color: catColor, backgroundColor: `${catColor}15` }}>
            {getCategoryIcon(cat, '14px', catColor)}
            <span>{cat}</span>
          </span>
        );
      },
    }),
    columnHelper.accessor('classification', {
      header: 'Class',
      cell: info => {
        const tx = info.row.original;
        return (
          <select
            value={tx.classification || 'unclassified'}
            onChange={(e) => handleClassificationChange(tx.id, e.target.value)}
            className="bg-transparent text-xs font-medium focus:outline-none focus:ring-0 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 py-1 rounded transition-colors w-[100px]"
          >
            <option value="income">Income</option>
            <option value="expense">Expense</option>
            <option value="investment">Investment</option>
            <option value="refund">Refund</option>
            <option value="transfer">Transfer</option>
            <option value="unclassified">Unclassified</option>
          </select>
        );
      }
    }),
    columnHelper.accessor('amount', {
      header: ({ column }) => (
        <div className="flex flex-col gap-1.5 items-end w-[120px]">
          <div className="flex items-center gap-1 cursor-pointer group hover:text-primary dark:hover:text-white transition-colors select-none text-xs" onClick={column.getToggleSortingHandler()}>
            Amount
            {{
              asc: <ArrowUp size={14} />,
              desc: <ArrowDown size={14} />,
            }[column.getIsSorted() as string] ?? <ArrowUpDown size={14} className="opacity-0 group-hover:opacity-50" />}
          </div>
          <select 
            value={(column.getFilterValue() ?? '') as string}
            onChange={e => column.setFilterValue(e.target.value)}
            className="text-xs bg-transparent border-b border-gray-300 dark:border-gray-700 py-0.5 focus:outline-none focus:border-primary text-right appearance-none cursor-pointer text-gray-500 dark:text-gray-400"
          >
            <option value="">All</option>
            <option value="dr">Debits (-)</option>
            <option value="cr">Credits (+)</option>
          </select>
        </div>
      ),
      filterFn: (row, columnId, filterValue) => {
        const amount = row.getValue<number>(columnId);
        if (filterValue === 'dr') return amount < 0;
        if (filterValue === 'cr') return amount > 0;
        return true;
      },
      cell: info => {
        const val = info.getValue() as number;
        return (
          <div className={`font-mono font-bold text-right text-sm whitespace-nowrap ${val < 0 ? 'text-red-500 dark:text-red-400' : 'text-green-500 dark:text-green-400'}`}>
            ₹{Math.abs(val).toLocaleString('en-IN')}
          </div>
        );
      }
    })
  ], [categoriesForSelectedMonth]);

  const table = useReactTable({
    data: tableData,
    columns,
    state: { sorting, columnFilters, columnVisibility },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 15 } },
    autoResetPageIndex: false,
  });

  if (loading) {
    return <div className="p-10 text-center text-gray-500">Calculating Analytics in Browser...</div>;
  }

  if (!metrics) {
    return (
      <div className="p-10 text-center space-y-4">
        <p className="text-gray-500">No bank statement transactions found.</p>
        <button
          onClick={() => navigate('/bank/import')}
          className="px-6 py-3 rounded-xl text-white font-bold transition-transform active:scale-95"
          style={{ backgroundColor: color }}
        >
          Import Your First Statement
        </button>
      </div>
    );
  }

  const formatCurrency = (val: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

  const activeBreakdown = categoryType === 'expense' 
    ? categoryBreakdowns.expense 
    : categoryBreakdowns.income;

  const pieData = Object.entries(activeBreakdown.breakdown)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  const PIE_COLORS = [color, '#f43f5e', '#10b981', '#f59e0b', '#8b5cf6', '#64748b'];

  const barData = Object.entries(metrics.merchantBreakdown)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  const fvData = [
    { name: 'Fixed', value: metrics.fixedVsVariable.fixed },
    { name: 'Variable', value: metrics.fixedVsVariable.variable }
  ].filter(d => d.value > 0);
  
  const FV_COLORS = ['#6366f1', '#f43f5e']; // Indigo (Fixed) and Rose (Variable)

  return (
    <div className="pt-[calc(env(safe-area-inset-top)+2rem)] space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-32">

      {/* Header Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-primary dark:text-white">Money Lens</h1>
          <div className="flex items-center gap-3 mt-2">
            {availableMonths.length > 0 && (
              <div className="relative group cursor-pointer">
                <select
                  value={selectedMonth}
                  onChange={e => handleMonthChange(e.target.value)}
                  className="bg-transparent text-sm font-bold text-gray-600 dark:text-gray-300 focus:outline-none cursor-pointer appearance-none pr-4 pb-0.5 border-b border-transparent group-hover:border-gray-400 dark:group-hover:border-gray-600 transition-colors z-10 relative"
                >
                  {availableMonths.map(m => {
                    const [year, month] = m.split('-');
                    const dateObj = new Date(parseInt(year), parseInt(month) - 1, 1);
                    return <option key={m} value={m}>{dateObj.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</option>;
                  })}
                </select>
                <div className="absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none opacity-50 group-hover:opacity-100 transition-opacity">
                   <ChevronDownIcon size={14} />
                </div>
              </div>
            )}
            <span className="text-gray-300 dark:text-gray-700">|</span>
            {accountsList.length > 0 && (
              <select
                value={selectedAccountFilter}
                onChange={e => setSelectedAccountFilter(e.target.value)}
                className="bg-transparent text-sm font-semibold text-gray-500 focus:outline-none cursor-pointer appearance-none border-b border-transparent hover:border-gray-400 dark:hover:border-gray-600 transition-colors pb-0.5"
              >
                <option value="all">All Banks</option>
                {accountsList.map(acc => (
                  <option key={acc.id} value={acc.id}>
                    {acc.bank_name} {acc.account_number ? `(${acc.account_number.slice(-4)})` : ''}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* 3 Dot Menu */}
        <div className="relative" ref={menuRef}>
          <button 
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          >
            <MoreHorizontal size={24} className="text-gray-600 dark:text-gray-300" />
          </button>
          
          {menuOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-[#1c1c1e] rounded-xl shadow-xl border border-gray-100 dark:border-gray-800 py-1 z-50">
              <button
                onClick={() => { setMenuOpen(false); navigate('/bank/unmapped'); }}
                className="w-full text-left px-4 py-2.5 text-sm hover:bg-black/5 dark:hover:bg-white/5 flex items-center justify-between"
              >
                <span className="flex items-center gap-2"><Sliders size={16} /> Map Pending</span>
                {unmappedCount > 0 && <span className="bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{unmappedCount}</span>}
              </button>
              <button
                onClick={() => { setMenuOpen(false); handleRerunMapping(); }}
                disabled={syncing}
                className="w-full text-left px-4 py-2.5 text-sm hover:bg-black/5 dark:hover:bg-white/5 flex items-center gap-2 disabled:opacity-50"
              >
                <RefreshCw size={16} className={syncing ? 'animate-spin' : ''} /> Sync Rules
              </button>
              <button
                onClick={() => { setMenuOpen(false); navigate('/bank/accounts'); }}
                className="w-full text-left px-4 py-2.5 text-sm hover:bg-black/5 dark:hover:bg-white/5 flex items-center gap-2"
              >
                <Landmark size={16} /> Accounts
              </button>
              <button
                onClick={() => { setMenuOpen(false); navigate('/bank/category-explorer'); }}
                className="w-full text-left px-4 py-2.5 text-sm hover:bg-black/5 dark:hover:bg-white/5 flex items-center gap-2"
              >
                <Compass size={16} /> Category Explorer
              </button>
              <div className="h-px bg-gray-100 dark:bg-gray-800 my-1"></div>
              <button
                onClick={() => { setMenuOpen(false); navigate('/bank/import'); }}
                className="w-full text-left px-4 py-2.5 text-sm hover:bg-black/5 dark:hover:bg-white/5 flex items-center gap-2 font-bold"
                style={{ color }}
              >
                <FileText size={16} /> Import Statement
              </button>
            </div>
          )}
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="p-5 rounded-2xl shadow-sm flex flex-col justify-between min-h-[100px]">
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 flex items-center gap-1"><Wallet size={14} /> Total Cash</span>
          <span className="text-xl font-black text-primary dark:text-white mt-auto">{formatCurrency(metrics.totalCashBalance)}</span>
        </Card>
        <Card className="p-5 rounded-2xl shadow-sm flex flex-col justify-between min-h-[100px]">
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 flex items-center gap-1"><ArrowUpRight size={14} className="text-green-500" /> Income</span>
          <span className="text-xl font-black text-green-600 dark:text-green-400 mt-auto">{formatCurrency(metrics.monthlyIncome)}</span>
        </Card>
        <Card className="p-5 rounded-2xl shadow-sm flex flex-col justify-between min-h-[100px]">
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 flex items-center gap-1"><ArrowDownRight size={14} className="text-red-500" /> Expenses</span>
          <span className="text-xl font-black text-red-600 dark:text-red-400 mt-auto">{formatCurrency(metrics.monthlyExpenses)}</span>
        </Card>
        <Card className="p-5 rounded-2xl shadow-sm flex flex-col justify-between min-h-[100px]">
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">Investments</span>
          <span className="text-xl font-black text-blue-600 dark:text-blue-400 mt-auto">{formatCurrency(metrics.monthlyInvestments || 0)}</span>
        </Card>
        <Card className="p-5 rounded-2xl shadow-sm flex flex-col justify-between min-h-[100px] col-span-2 md:col-span-1">
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">Savings Rate</span>
          <span className="text-xl font-black text-primary dark:text-white mt-auto">{metrics.savingsRate.toFixed(1)}%</span>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 pb-10">
        
        {/* Cash Flow Trend */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider ml-1">Cash Flow Trend</h3>
          <Card className="p-6 rounded-2xl shadow-sm">
            <div className="h-64 -ml-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={metrics.cashFlowTrend}>
                  <XAxis dataKey="month" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `₹${val / 1000}k`} />
                  <RechartsTooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} formatter={(val: number) => formatCurrency(val)} />
                  <Line type="monotone" dataKey="income" stroke="#10b981" strokeWidth={3} dot={false} />
                  <Line type="monotone" dataKey="expenses" stroke="#f43f5e" strokeWidth={3} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        {/* Cumulative Burn Rate */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider ml-1">Cumulative Burn Rate ({selectedMonth})</h3>
          <Card className="p-6 rounded-2xl shadow-sm">
            <div className="h-64 -ml-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={metrics.cumulativeBurnRate}>
                  <XAxis dataKey="day" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `₹${val / 1000}k`} />
                  <RechartsTooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} formatter={(val: number) => formatCurrency(val)} labelFormatter={(label) => `Day ${label}`} />
                  <Line type="monotone" dataKey="amount" stroke={color} strokeWidth={3} dot={false} fillOpacity={1} fill={`url(#colorBurn)`} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        {/* Expenses/Income by Category */}
        <div className="pt-4 space-y-3">
          <div className="flex items-center justify-between mb-1 ml-1">
            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">
              {categoryType === 'expense' ? 'Expenses by Category' : 'Income by Category'}
            </h3>
            
            {/* Sliding Toggle Switch */}
            <div className="flex bg-black/5 dark:bg-white/5 border border-gray-200 dark:border-gray-800 rounded-lg p-0.5 select-none">
              <button
                onClick={() => { setCategoryType('expense'); setExpandedCategory(null); }}
                className={`px-3 py-1 rounded-md text-[10px] font-bold tracking-wider uppercase transition-all duration-200 ${
                  categoryType === 'expense' 
                    ? 'bg-white dark:bg-white/10 shadow-sm text-primary dark:text-white' 
                    : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                }`}
              >
                Expenses
              </button>
              <button
                onClick={() => { setCategoryType('income'); setExpandedCategory(null); }}
                className={`px-3 py-1 rounded-md text-[10px] font-bold tracking-wider uppercase transition-all duration-200 ${
                  categoryType === 'income' 
                    ? 'bg-white dark:bg-white/10 shadow-sm text-primary dark:text-white' 
                    : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                }`}
              >
                Income
              </button>
            </div>
          </div>

          <Card className="p-6 rounded-2xl shadow-sm">
            {pieData.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                <div className="h-56 flex items-center justify-center relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} innerRadius={60} outerRadius={80} paddingAngle={2} dataKey="value" stroke="none">
                        {pieData.map((entry, index) => {
                          const catColor = CATEGORY_COLORS[entry.name] || PIE_COLORS[index % PIE_COLORS.length];
                          return <Cell key={`cell-${index}`} fill={catColor} />;
                        })}
                      </Pie>
                      <RechartsTooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }} formatter={(val: number) => formatCurrency(val)} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute pointer-events-none text-center">
                    <span className="text-[10px] text-gray-500 uppercase tracking-wider block font-bold">Top</span>
                    <span className="font-bold text-sm truncate max-w-[100px] block">{pieData[0]?.name || 'N/A'}</span>
                  </div>
                </div>

                {/* Category List */}
                <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1 no-scrollbar border-t md:border-t-0 md:border-l border-gray-100 dark:border-gray-800/80 pt-4 md:pt-0 md:pl-6">
                  {Object.entries(activeBreakdown.breakdown)
                    .map(([name, value]) => ({ name, value }))
                    .sort((a, b) => b.value - a.value)
                    .map((catItem) => {
                      const catName = catItem.name;
                      const catValue = catItem.value;
                      const catColor = CATEGORY_COLORS[catName] || '#6b7280';
                      const percentage = ((catValue / (activeBreakdown.total || 1)) * 100).toFixed(1);
                      const isExpanded = expandedCategory === catName;

                      // Filter transactions for this specific category and type
                      const catTransactions = tableData.filter(t => 
                        (t.category || 'Other') === catName && 
                        (categoryType === 'expense' 
                          ? (t.classification === 'expense' || t.classification === 'refund')
                          : t.classification === 'income')
                      );
                      
                      return (
                        <div key={catName} className="border-b border-gray-100/50 dark:border-gray-800/30 last:border-0 py-0.5">
                          <div 
                            onClick={() => setExpandedCategory(isExpanded ? null : catName)}
                            className="flex items-center justify-between py-1 cursor-pointer hover:bg-black/[0.02] dark:hover:bg-white/[0.02] px-1 rounded transition-colors"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: catColor }} />
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold" style={{ color: catColor, backgroundColor: `${catColor}12` }}>
                                {getCategoryIcon(catName, '11px', catColor)}
                                <span className="ml-1 truncate max-w-[90px]">{catName}</span>
                              </span>
                            </div>
                            <div className="flex items-center gap-2 font-mono text-xs">
                              <span className="text-gray-400 dark:text-gray-500 text-[10px]">{percentage}%</span>
                              <span className="font-bold text-primary dark:text-white">{formatCurrency(catValue)}</span>
                              <ChevronDownIcon size={12} className={`text-gray-400 dark:text-gray-600 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                            </div>
                          </div>

                          {/* Expanded Transactions List */}
                          {isExpanded && (
                            <div 
                              className="mt-1.5 ml-2.5 pl-2.5 border-l border-dashed space-y-1.5 py-1 animate-in slide-in-from-top-2 duration-200" 
                              style={{ borderColor: `${catColor}40` }}
                            >
                              {catTransactions.length > 0 ? (
                                <>
                                  {catTransactions.map((tx) => (
                                    <div key={tx.id} className="flex items-center justify-between text-[10px] hover:bg-black/[0.01] dark:hover:bg-white/[0.01] py-0.5 pr-1 rounded">
                                      <div className="min-w-0 flex-1 pr-3">
                                        <p className="font-semibold text-gray-700 dark:text-gray-300 truncate" title={tx.merchant || tx.description}>
                                          {tx.merchant || 'Unknown'}
                                        </p>
                                        <p className="text-[9px] text-gray-400 font-mono">
                                          {tx.transaction_date.substring(5)}
                                        </p>
                                      </div>
                                      <span className={`font-mono font-bold ${tx.amount < 0 ? 'text-red-500/80 dark:text-red-400/80' : 'text-green-500/80 dark:text-green-400/80'}`}>
                                        {tx.amount < 0 ? '-' : '+'}₹{Math.round(Math.abs(tx.amount)).toLocaleString('en-IN')}
                                      </span>
                                    </div>
                                  ))}
                                  <button
                                    onClick={() => navigate(`/bank/category-explorer?category=${encodeURIComponent(catName)}`)}
                                    className="w-full text-center text-[9px] font-bold text-gray-400 hover:text-primary dark:hover:text-white transition-colors pt-2.5 flex items-center justify-center gap-1 cursor-pointer"
                                  >
                                    View History Across All Months ➔
                                  </button>
                                </>
                              ) : (
                                <p className="text-[10px] text-gray-400 italic pl-1">No direct transactions found.</p>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>
            ) : (
              <div className="h-56 flex items-center justify-center">
                <p className="text-sm text-gray-500">
                  {categoryType === 'expense' ? 'No expenses recorded.' : 'No income recorded.'}
                </p>
              </div>
            )}
          </Card>
        </div>

        {/* Fixed vs Variable */}
        <div className="pt-4 space-y-3">
          <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider ml-1">Fixed vs Variable</h3>
          <Card className="p-6 rounded-2xl shadow-sm">
            <div className="h-64 flex items-center justify-center relative">
              {fvData.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={fvData} innerRadius={60} outerRadius={80} paddingAngle={2} dataKey="value" stroke="none">
                        {fvData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={FV_COLORS[index % FV_COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }} formatter={(val: number) => formatCurrency(val)} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute pointer-events-none text-center">
                    <span className="text-[10px] text-gray-500 uppercase tracking-wider block font-bold">Fixed</span>
                    <span className="font-bold text-sm truncate max-w-[100px] block">
                      {metrics.fixedVsVariable.fixed > 0 
                        ? `${Math.round((metrics.fixedVsVariable.fixed / metrics.monthlyExpenses) * 100)}%` 
                        : '0%'}
                    </span>
                  </div>
                </>
              ) : (
                <p className="text-sm text-gray-500">No expenses recorded.</p>
              )}
            </div>
          </Card>
        </div>

        {/* Top Merchants */}
        <div className="lg:col-span-2 pt-4 space-y-3">
          <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider ml-1">Top Merchants This Month</h3>
          <Card className="p-6 rounded-2xl shadow-sm">
            <div className="h-64 flex items-center justify-center">
              {barData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData} layout="vertical" margin={{ left: 50 }}>
                    <XAxis type="number" hide />
                    <YAxis type="category" dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                    <RechartsTooltip cursor={{ fill: 'rgba(0,0,0,0.05)' }} contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} formatter={(val: number) => formatCurrency(val)} />
                    <Bar dataKey="value" fill={color} radius={[0, 4, 4, 0]} barSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-gray-500">No merchant transactions recorded for this month.</p>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Account Statement Section (Table) */}
      <div className="space-y-4 pt-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Statement Details</h3>
          
          {/* Column Toggle Menu */}
          <div className="relative" ref={columnsMenuRef}>
            <button 
              onClick={() => setColumnsMenuOpen(!columnsMenuOpen)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <Sliders size={14} /> Columns
            </button>
            
            {columnsMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-[#1c1c1e] rounded-xl shadow-xl border border-gray-100 dark:border-gray-800 py-2 z-50">
                <div className="px-3 pb-2 mb-2 border-b border-gray-100 dark:border-gray-800 text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Toggle Columns
                </div>
                {table.getAllLeafColumns().map(column => {
                  return (
                    <label key={column.id} className="flex items-center gap-2 px-4 py-1.5 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer text-sm">
                      <input
                        type="checkbox"
                        checked={column.getIsVisible()}
                        onChange={column.getToggleVisibilityHandler()}
                        className="rounded border-gray-300 dark:border-gray-600 text-primary focus:ring-primary"
                      />
                      {column.id === 'transaction_date' ? 'Date' :
                       column.id === 'merchant' ? 'Mapped Description' :
                       column.id === 'description' ? 'Raw Description' :
                       column.id === 'category' ? 'Category' :
                       column.id === 'classification' ? 'Class' :
                       column.id === 'amount' ? 'Amount' : column.id}
                    </label>
                  )
                })}
              </div>
            )}
          </div>
        </div>
        
        <Card className="p-6 rounded-2xl shadow-sm">
          <div className="overflow-x-auto no-scrollbar pb-4">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                {table.getHeaderGroups().map(headerGroup => (
                  <tr key={headerGroup.id} className="border-b border-gray-200 dark:border-gray-800">
                    {headerGroup.headers.map(header => (
                      <th key={header.id} className="pb-3 pr-4 font-bold text-xs text-gray-400 uppercase tracking-wider align-bottom">
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800/40">
                {table.getRowModel().rows.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length} className="py-10 text-center text-sm text-gray-500">
                      No transactions found for the selected filters.
                    </td>
                  </tr>
                ) : (
                  table.getRowModel().rows.map(row => (
                    <tr key={row.id} className="hover:bg-black/[0.01] dark:hover:bg-white/[0.01] transition-colors duration-150">
                      {row.getVisibleCells().map(cell => (
                        <td key={cell.id} className="py-3 pr-4 align-middle">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {table.getPageCount() > 1 && (
            <div className="flex items-center justify-between border-t border-gray-200 dark:border-gray-800 pt-4">
              <span className="text-xs text-gray-500 font-medium">
                Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                  className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 transition-colors"
                >
                  <ChevronLeft size={18} />
                </button>
                <button
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                  className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 transition-colors"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

// Chevron down helper for select
function ChevronDownIcon({ size, className }: { size: number, className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="m6 9 6 6 6-6"/>
    </svg>
  );
}
