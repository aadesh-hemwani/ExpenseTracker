import React, { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';
import { useExpenses } from '../hooks/useExpenses';
import { processMonthlyData, getCategoryBreakdown } from '../utils/analyticsHelpers';
import { ArrowUpRight, PieChart } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useState, useEffect } from 'react';
import Card from '../components/Card';

const formatCurrency = (val) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

// Custom Tooltip Component for Recharts
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-black p-3 border border-gray-100 dark:border-gray-800 shadow-xl rounded-xl">
        <p className="text-xs text-gray-400 font-semibold mb-1">{label}</p>
        <p className="text-lg font-bold text-gray-900 dark:text-white">
          {formatCurrency(payload[0].value)}
        </p>
      </div>
    );
  }
  return null;
};

const Analytics = () => {
  const { user } = useAuth();
  const { expenses } = useExpenses();
  const { theme, accentColor, accentColors } = useTheme();
  const [budget, setBudget] = useState(0);

  useEffect(() => {
    const fetchBudget = async () => {
      if (user?.uid) {
        const userRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(userRef);
        if (docSnap.exists()) {
          setBudget(docSnap.data().monthlyBudgetCap || 0);
        }
      }
    };
    fetchBudget();
  }, [user]);

  // Memoize data calculation so it doesn't run on every render
  const monthlyData = useMemo(() => processMonthlyData(expenses), [expenses]);
  const categoryData = useMemo(() => getCategoryBreakdown(expenses), [expenses]);

  const currentMonthTotal = monthlyData[monthlyData.length - 1]?.total || 0;
  const topCategory = categoryData[0];

  // Chart Colors based on Theme
  const gridColor = theme === 'dark' ? '#374151' : '#f3f4f6';
  const cursorColor = theme === 'dark' ? '#1f2937' : '#f9fafb';
  const textColor = '#9ca3af';

  return (
    <div className="space-y-8 animate-fade-in pt-4">

      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white">Insights</h1>
        <p className="text-gray-500 mt-2">Visualize your spending patterns.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="p-5 bg-gradient-to-br from-accent to-purple-900 dark:to-purple-400 text-white rounded-3xl shadow-lg">
          <div className="flex justify-between items-start mb-4">
            <span className="text-xs font-medium dark:text-gray-950 uppercase tracking-wider">This Month</span>
            <ArrowUpRight className="w-4 h-4 dark:text-gray-950" />
          </div>
          <div className="text-4xl font-bold">{formatCurrency(currentMonthTotal)}</div>
        </div>

        <Card className="rounded-2xl p-5">
          <div className="flex justify-between items-start mb-4">
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Top Category</span>
            <PieChart className="w-4 h-4 text-gray-400" />
          </div>
          <div className="text-xl font-bold text-gray-900 dark:text-white truncate">
            {topCategory ? topCategory.name : '—'}
          </div>
          <div className="text-sm text-gray-500 mt-1">
            {topCategory ? formatCurrency(topCategory.value) : 'No data'}
          </div>
        </Card>
      </div>

      {/* Budget Progress Card */}
      {budget > 0 && (
        <Card className="p-6">
          <div className="flex justify-between items-end mb-2">
            <div>
              <p className="text-sm font-medium text-gray-400 uppercase tracking-wider">Monthly Budget</p>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {formatCurrency(currentMonthTotal)} <span className="text-sm font-normal text-gray-400">/ {formatCurrency(budget)}</span>
              </h2>
            </div>
            <div className="text-right">
              <span className={`text-xl font-bold ${(currentMonthTotal / budget) > 1 ? 'text-red-500' :
                (currentMonthTotal / budget) > 0.8 ? 'text-yellow-500' : 'text-green-500'
                }`}>
                {Math.min(((currentMonthTotal / budget) * 100).toFixed(0), 999)}%
              </span>
            </div>
          </div>

          {/* Progress Bar Container */}
          <div className="h-4 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden mt-3">
            <div
              className={`h-full rounded-full transition-all duration-1000 ease-out ${(currentMonthTotal / budget) > 1 ? 'bg-red-500' :
                (currentMonthTotal / budget) > 0.8 ? 'bg-yellow-400' : 'bg-green-500'
                }`}
              style={{ width: `${Math.min((currentMonthTotal / budget) * 100, 100)}%` }}
            />
          </div>

          <p className="text-xs text-gray-400 mt-3 text-right">
            {currentMonthTotal > budget
              ? `Over budget by ${formatCurrency(currentMonthTotal - budget)}`
              : `${formatCurrency(budget - currentMonthTotal)} remaining`}
          </p>
        </Card>
      )}

      {/* Monthly Trend Chart */}
      <Card>
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Monthly Trend</h3>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fill: textColor, fontSize: 12 }}
                dy={10}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: textColor, fontSize: 12 }}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: cursorColor }} />
              <Bar dataKey="total" radius={[6, 6, 6, 6]} barSize={32}>
                {monthlyData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={index === monthlyData.length - 1 ? accentColors[accentColor]?.default || '#6366f1' : '#e5e7eb'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>



      {/* Category Breakdown List */}
      <div className="space-y-4 pb-20">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Breakdown</h3>
        {categoryData.map((cat, index) => (
          <div key={index} className="flex items-center justify-between p-3">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-accent" />
              <span className="font-medium text-gray-700 dark:text-gray-300">{cat.name}</span>
            </div>
            <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(cat.value)}</span>
          </div>
        ))}
        {categoryData.length === 0 && (
          <div className="text-center py-10 text-gray-400 text-sm">No expenses recorded yet.</div>
        )}
      </div>
    </div>
  );
};

export default Analytics;