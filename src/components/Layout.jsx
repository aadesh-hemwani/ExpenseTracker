import React, { useState } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { Home, Calendar, BarChart2, User, Plus, X, Loader2, Apple, ShoppingCart, Car, PartyPopper, IndianRupee, Calendar as CalendarIcon } from 'lucide-react';
import { useExpenses } from '../hooks/useExpenses';

const NavItem = ({ to, icon: Icon, label }) => (
  <NavLink
    to={to}
    className={({ isActive }) =>
      `flex flex-col items-center justify-center transition-all duration-300 ${isActive
        ? 'px-6 py-3 rounded-full bg-[color-mix(in_srgb,var(--color-accent),transparent_25%)] text-white shadow-[0_0_50px_rgba(99,102,241,0.06)] scale-110'
        : 'w-12 h-12 text-gray-400 hover:text-gray-900 dark:hover:text-white'
      }`
    }
  >
    {({ isActive }) => (
      <>
        <Icon className="w-5 h-5 mb-0.5" strokeWidth={2.5} />
        <span className={`text-[10px] font-medium leading-none ${isActive ? 'block' : 'hidden md:block'}`}>{label}</span>
      </>
    )}
  </NavLink>
);

const Layout = () => {
  return (
    <div className="flex flex-col h-screen bg-white dark:bg-black text-gray-900 dark:text-gray-100 font-sans md:flex-row transition-colors duration-200">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-gray-50 dark:bg-black border-r border-gray-100 dark:border-gray-800 h-full p-8 transition-colors duration-200">
        <h1 className="text-2xl font-bold tracking-tight mb-10 text-gray-900 dark:text-white">Expenses.</h1>
        <nav className="flex flex-col space-y-4">
          <NavItem to="/" icon={Home} label="Dashboard" />
          <NavItem to="/history" icon={Calendar} label="History" />
          <NavItem to="/analytics" icon={BarChart2} label="Insights" />
          <div className="mt-auto">
            <NavItem to="/profile" icon={User} label="Profile" />
          </div>
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto relative no-scrollbar bg-white dark:bg-black transition-colors duration-200">
        <div className="max-w-2xl mx-auto p-5 md:p-10 pb-24 md:pb-10">
          <Outlet />
        </div>
      </main>

      {/* Global Add Expense FAB & Modal */}
      <GlobalAddExpense />

      {/* Mobile Bottom Navigation - Floating Pill */}
      <nav className="md:hidden fixed bottom-6 left-4 right-24 h-[4.5rem] bg-black/5 dark:bg-white/10 backdrop-blur-sm border-2 border-black/10 dark:border-white/10 rounded-full px-2 shadow-[0_0_15px_rgba(99,102,241,0.12)] flex justify-between items-center z-50 transition-all duration-300">
        <NavItem to="/" icon={Home} label="Home" />
        <NavItem to="/history" icon={Calendar} label="History" />
        <NavItem to="/analytics" icon={BarChart2} label="Insights" />
        <NavItem to="/profile" icon={User} label="Profile" />
      </nav>
    </div>
  );
};

// --- Global Add Expense Component (Moved from Home.jsx) ---
const GlobalAddExpense = () => {
  const { addExpense } = useExpenses();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Food');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  const handleCloseModal = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsAddModalOpen(false);
      setIsClosing(false);
    }, 500);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!amount) return;

    setIsSubmitting(true);
    try {
      await addExpense(amount, category, note, date);
      setAmount('');
      setCategory('Food');
      setNote('');
      setDate(new Date().toISOString().split('T')[0]);
      handleCloseModal();
    } catch (error) {
      console.error("Failed to add expense", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsAddModalOpen(true)}
        className="fixed bottom-6 right-4 w-[4.5rem] h-[4.5rem] bg-accent text-white rounded-full shadow-2xl hover:bg-accent-hover transition-all active:scale-95 hover:scale-105 z-40 flex items-center justify-center shadow-accent/30 border border-white/20"
        aria-label="Add Expense"
      >
        <Plus className="w-8 h-8" />
      </button>

      {isAddModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center">
          <div
            className={`absolute inset-0 bg-gray-900/50 backdrop-blur-sm transition-opacity ${isClosing ? 'animate-fade-out' : 'animate-fade-in'}`}
            onClick={handleCloseModal}
          />
          <div className={`relative z-10 bg-white dark:bg-black w-[95%] md:w-[32rem] max-w-full rounded-3xl md:rounded-3xl px-6 py-6 md:p-8 shadow-2xl duration-300 max-h-[90vh] flex flex-col mx-auto mb-3 md:mb-0 border border-gray-200 dark:border-gray-800 ${isClosing ? 'animate-slide-down' : 'animate-slide-up'}`}>
            <div className="flex justify-between items-center mb-6 shrink-0">
              <h3 className="text-xl font-bold dark:text-white">New Expense</h3>
              <button onClick={handleCloseModal} className="p-2 bg-gray-100 dark:bg-gray-900 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors">
                <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>
            </div>
            <div className="overflow-y-auto">
              <form onSubmit={handleSave} className="space-y-6">
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">Date</label>
                  <div className="relative">
                    <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full min-w-0 appearance-none bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 pl-10 text-base font-semibold text-gray-900 dark:text-white focus:ring-0 focus:border-none focus:outline-none" required />
                    <CalendarIcon className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">Amount</label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"><span className="text-gray-500 dark:text-gray-400 font-bold text-xl">₹</span></div>
                    <input type="number" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl py-4 pl-10 pr-4 text-xl font-bold text-gray-900 dark:text-white focus:ring-0 focus:border-none focus:outline-none" required />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">Category</label>
                  <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                    {['Food', 'Transport', 'Shop', 'Bills', 'Entertainment', 'Health'].map(cat => (
                      <button key={cat} type="button" onClick={() => setCategory(cat)} className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-colors border ${category === cat ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 border-gray-900 dark:border-white shadow-lg' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'}`}>{cat}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">Note</label>
                  <input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add a note..." className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 text-base  font-medium text-gray-900 dark:text-white focus:ring-0 focus:border-none focus:outline-none" />
                </div>
                <button type="submit" disabled={isSubmitting || !amount} className="w-full bg-accent text-white py-4 rounded-xl font-bold text-lg hover:bg-accent-hover transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-xl shadow-accent/20">
                  {isSubmitting && <Loader2 className="w-5 h-5 animate-spin" />}
                  Save Expense
                </button>
                <div className="h-6 md:hidden"></div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Layout;