import { Outlet, NavLink, useLocation } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import { Home, Calendar, BarChart3, User } from "lucide-react";
import GlobalAddExpense from "./GlobalAddExpense";
import { LiquidNavBar } from "./ui/LiquidNavBar";
import { motion } from "framer-motion";

interface NavItemProps {
  to: string;
  icon: any;
  label: string;
  activeColor: string;
}

const NavItem = ({
  to,
  icon: Icon,
  label,
  activeColor,
}: NavItemProps) => (
  <NavLink to={to} className="relative flex items-center justify-center group">
    {({ isActive }) => (
      <div className="flex flex-col items-center">
        <motion.div
          whileTap={{ scale: 0.9 }}
          className={`
            relative flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-300
            ${isActive
              ? "bg-primary text-white shadow-soft"
              : "text-gray-400 dark:text-gray-500 hover:bg-black/5 dark:hover:bg-white/10"
            }
          `}
        >
          <Icon
            color={isActive ? activeColor : "currentColor"}
            size={24}
            className={`transition-all duration-300`}
            strokeWidth={isActive ? 2.5 : 2}
          />
        </motion.div>
        <span
          className={`text-[10px] font-bold mt-1 transition-colors ${isActive ? "" : "text-gray-400 dark:text-gray-500"
            }`}
          style={isActive ? { color: activeColor } : {}}
        >
          {label}
        </span>
      </div>
    )}
  </NavLink>
);

const NAV_ITEMS = [
  { path: "/", icon: Home, label: "Home" },
  {
    path: "/history",
    icon: Calendar,
    label: "History",
  },
  {
    path: "/analytics",
    icon: BarChart3,
    label: "Insights",
  },
  {
    path: "/profile",
    icon: User,
    label: "Profile",
  },
];

const Layout = () => {
  const location = useLocation();
  const { accentColor, accentColors } = useTheme();
  // @ts-ignore
  const activeColor = accentColors[accentColor]?.default || "#6366f1";

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
          <NavItem
            to="/"
            icon={Home}
            label="Dashboard"
            activeColor={activeColor}
          />
          <NavItem
            to="/history"
            icon={Calendar}
            label="History"
            activeColor={activeColor}
          />
          <NavItem
            to="/analytics"
            icon={BarChart3}
            label="Insights"
            activeColor={activeColor}
          />
          <NavItem
            to="/profile"
            icon={User}
            label="Profile"
            activeColor={activeColor}
          />
        </nav>
      </aside>

      {/* Main Content Area */}
      <main
        className="flex-1 relative overflow-y-auto no-scrollbar overscroll-contain"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        <div
          className={`relative z-10 max-w-2xl mx-auto px-5 pb-32 md:p-10 ${location.pathname === "/history"
            ? "pt-0"
            : "pt-[calc(env(safe-area-inset-top)+1.5rem)]"
            }`}
        >
          {/* <AnimatePresence mode="wait"> */}
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            // exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          >
            <Outlet />
          </motion.div>
          {/* </AnimatePresence> */}
        </div>
      </main>

      {/* Global Add Expense FAB & Modal */}
      {!location.pathname.startsWith("/admin") && <GlobalAddExpense />}

      {/* Mobile Bottom Navigation - Liquid Glass Style */}
      <div className="md:hidden fixed bottom-[calc(1.5rem+env(safe-area-inset-bottom))] left-4 right-[6rem] z-50">
        <LiquidNavBar items={NAV_ITEMS} />
      </div>
    </div>
  );
};

export default Layout;
