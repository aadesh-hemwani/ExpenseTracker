import { Outlet, NavLink, useLocation } from "react-router-dom";
import {
  Home,
  Calendar,
  BarChart2,
  Sparkles,
  LucideIcon,
  User,
} from "lucide-react";
import GlobalAddExpense from "./GlobalAddExpense";
import { LiquidNavBar } from "./ui/LiquidNavBar";
import { motion, AnimatePresence } from "framer-motion";

interface NavItemProps {
  to: string;
  icon: LucideIcon;
  label: string;
}

const NavItem = ({ to, icon: Icon, label }: NavItemProps) => (
  <NavLink to={to} className="relative flex items-center justify-center">
    {({ isActive }) => (
      <motion.div
        whileTap={{ scale: 0.8 }}
        className={`
        relative flex flex-col items-center justify-center rounded-full transition-all duration-300
        ${isActive ? "px-6 py-3" : "w-12 h-12"}
      `}
      >
        {isActive && (
          <motion.div
            layoutId="nav-pill"
            className="absolute inset-0 bg-[color-mix(in_srgb,var(--color-accent),transparent_25%)] rounded-full shadow-[0_0_20px_rgba(99,102,241,0.3)] z-0"
            transition={{ type: "spring", bounce: 0.3, duration: 0.8 }}
          />
        )}

        <div
          className={`relative z-10 flex flex-col items-center transition-colors duration-200 ${
            isActive
              ? "text-white"
              : "text-gray-400 hover:text-gray-900 dark:hover:text-white"
          }`}
        >
          <Icon
            className={`w-5 h-5 mb-0.5 ${isActive ? "scale-110" : ""}`}
            strokeWidth={2.5}
          />
          <span
            className={`text-[10px] font-medium leading-none whitespace-nowrap ${
              isActive ? "block" : "hidden md:block"
            }`}
          >
            {label}
          </span>
        </div>
      </motion.div>
    )}
  </NavLink>
);

const Layout = () => {
  const location = useLocation();

  return (
    <div className="flex flex-col h-[100dvh] bg-white dark:bg-black text-gray-900 dark:text-gray-100 font-sans md:flex-row transition-colors duration-200">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-gray-50 dark:bg-black border-r border-gray-100 dark:border-white/10 h-full p-8 transition-colors duration-200">
        <h1 className="text-2xl font-bold tracking-tight mb-10 text-gray-900 dark:text-white">
          Expenses.
        </h1>
        <nav className="flex flex-col space-y-4 items-center flex-1">
          <NavItem to="/" icon={Home} label="Dashboard" />
          <NavItem to="/history" icon={Calendar} label="History" />
          <NavItem to="/analytics" icon={BarChart2} label="Insights" />
          <div className="mt-auto w-full flex justify-center">
            <NavItem to="/profile" icon={User} label="Profile" />
          </div>
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto relative no-scrollbar bg-white dark:bg-black transition-colors duration-200 overscroll-contain">
        <div className="max-w-2xl mx-auto p-5 md:p-10 pb-24 md:pb-10">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Global Add Expense FAB & Modal */}
      <GlobalAddExpense />

      {/* Mobile Bottom Navigation - Liquid Glass Style */}
      <div className="md:hidden fixed bottom-6 left-4 right-24 z-50">
        <LiquidNavBar
          items={[
            {
              path: "/",
              icon: Home,
              label: "Home",
            },
            {
              path: "/history",
              icon: Calendar,
              label: "History",
            },
            {
              path: "/analytics",
              icon: Sparkles,
              label: "Insights",
            },
            {
              path: "/profile",
              icon: User,
              label: "Profile",
            },
          ]}
        />
      </div>
    </div>
  );
};

export default Layout;
