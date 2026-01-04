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
  <NavLink to={to} className="relative flex items-center justify-center group">
    {({ isActive }) => (
      <div className="flex flex-col items-center">
        <motion.div
          whileTap={{ scale: 0.9 }}
          className={`
            relative flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-300
            ${
              isActive
                ? "bg-primary text-white shadow-soft"
                : "text-secondary hover:bg-black/5 dark:hover:bg-white/10"
            }
          `}
        >
          <Icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 2} />
        </motion.div>
        <span
          className={`text-[10px] font-medium mt-1 transition-colors ${
            isActive ? "text-primary dark:text-white" : "text-tertiary"
          }`}
        >
          {label}
        </span>
      </div>
    )}
  </NavLink>
);

const Layout = () => {
  const location = useLocation();

  return (
    <div className="flex flex-col h-full w-full bg-body text-primary font-sans md:flex-row transition-colors duration-300 overflow-hidden">
      {/* Desktop Sidebar (Glass) */}
      <aside className="hidden md:flex flex-col w-72 glass border-r border-subtle h-full p-6 z-20">
        <div className="mb-12 px-2">
          <h1 className="text-xl font-bold tracking-tight text-primary">
            Expenses.
          </h1>
        </div>

        <nav className="flex flex-col space-y-6">
          <NavItem to="/" icon={Home} label="Dashboard" />
          <NavItem to="/history" icon={Calendar} label="History" />
          <NavItem to="/analytics" icon={BarChart2} label="Insights" />
          <NavItem to="/profile" icon={User} label="Profile" />
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 relative overflow-y-auto no-scrollbar overscroll-contain">
        {/* Mobile Header Gradient (Optional background flair) */}
        <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-surface/50 to-transparent pointer-events-none z-0" />

        <div className="relative z-10 max-w-2xl mx-auto p-5 pt-safe md:p-10 pb-32 md:pb-10">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Global Add Expense FAB & Modal */}
      {!location.pathname.startsWith("/admin") && <GlobalAddExpense />}

      {/* Mobile Bottom Navigation - Liquid Glass Style */}
      <div className="md:hidden fixed bottom-6 left-4 right-[6rem] z-50">
        <LiquidNavBar
          items={[
            { path: "/", icon: Home, label: "Home" },
            { path: "/history", icon: Calendar, label: "History" },
            { path: "/analytics", icon: Sparkles, label: "Insights" },
            { path: "/profile", icon: User, label: "Profile" },
          ]}
        />
      </div>
    </div>
  );
};

export default Layout;
