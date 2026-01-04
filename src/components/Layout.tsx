import { Outlet, NavLink, useLocation } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import {
  HomeOutline,
  Home,
  CalendarOutline,
  Calendar,
  BarChartOutline,
  BarChart,
  PersonOutline,
  Person,
  BulbOutline,
  Bulb,
} from "react-ionicons";
import GlobalAddExpense from "./GlobalAddExpense";
import { LiquidNavBar } from "./ui/LiquidNavBar";
import { motion, AnimatePresence } from "framer-motion";

interface NavItemProps {
  to: string;
  icon: any;
  activeIcon: any;
  label: string;
  activeColor: string;
}

const NavItem = ({
  to,
  icon: Icon,
  activeIcon: ActiveIcon,
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
            ${
              isActive
                ? "bg-primary text-white shadow-soft"
                : "text-secondary hover:bg-black/5 dark:hover:bg-white/10"
            }
          `}
        >
          {isActive ? (
            <ActiveIcon
              color={activeColor}
              height="20px"
              width="20px"
              cssClasses="text-current"
            />
          ) : (
            <Icon
              color="inherit"
              height="20px"
              width="20px"
              cssClasses="text-current"
            />
          )}
        </motion.div>
        <span
          className={`text-[10px] font-medium mt-1 transition-colors ${
            isActive ? "" : "text-tertiary"
          }`}
          style={isActive ? { color: activeColor } : {}}
        >
          {label}
        </span>
      </div>
    )}
  </NavLink>
);

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
            icon={HomeOutline}
            activeIcon={Home}
            label="Dashboard"
            activeColor={activeColor}
          />
          <NavItem
            to="/history"
            icon={CalendarOutline}
            activeIcon={Calendar}
            label="History"
            activeColor={activeColor}
          />
          <NavItem
            to="/analytics"
            icon={BarChartOutline}
            activeIcon={BarChart}
            label="Insights"
            activeColor={activeColor}
          />
          <NavItem
            to="/profile"
            icon={PersonOutline}
            activeIcon={Person}
            label="Profile"
            activeColor={activeColor}
          />
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
            { path: "/", icon: HomeOutline, activeIcon: Home, label: "Home" },
            {
              path: "/history",
              icon: CalendarOutline,
              activeIcon: Calendar,
              label: "History",
            },
            {
              path: "/analytics",
              icon: BulbOutline,
              activeIcon: Bulb,
              label: "Insights",
            },
            {
              path: "/profile",
              icon: PersonOutline,
              activeIcon: Person,
              label: "Profile",
            },
          ]}
        />
      </div>
    </div>
  );
};

export default Layout;
