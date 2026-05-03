import { Outlet, NavLink, useLocation } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import { Home, Calendar, BarChart3, User } from "lucide-react";
import GlobalAddExpense from "./GlobalAddExpense";
import { LiquidNavBar } from "./ui/LiquidNavBar";
import { motion, AnimatePresence } from "framer-motion";
import { LiquidFAB } from "./ui/LiquidFAB";
import { useGlobalModal } from "../context/GlobalModalContext";
import { LiquidFilter } from "./ui/LiquidFilter";
import { createContext, useContext, useRef, useEffect } from "react";

const ScrollContext = createContext<React.RefObject<HTMLDivElement | null> | null>(null);
export const useScrollContainer = () => useContext(ScrollContext);

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
  <NavLink to={to} className="relative flex items-center group">
    {({ isActive }) => (
      <div className="flex items-center w-full px-4 py-3 rounded-2xl transition-all duration-300 relative overflow-hidden">
        {/* Active Highlight Background */}
        {isActive && (
          <motion.div
            layoutId="active-nav-bg"
            className="absolute inset-0 bg-white dark:bg-white/5 shadow-soft z-0"
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          />
        )}
        
        <div className="relative z-10 flex items-center gap-4">
          <motion.div
            whileTap={{ scale: 0.9 }}
            className={`
              relative flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-300
              ${isActive
                ? "text-white"
                : "text-gray-400 dark:text-gray-500 group-hover:text-primary dark:group-hover:text-white"
              }
            `}
            style={isActive ? { backgroundColor: activeColor } : {}}
          >
            <Icon
              color={isActive ? "white" : "currentColor"}
              size={22}
              className={`transition-all duration-300`}
              strokeWidth={isActive ? 2.5 : 2}
            />
          </motion.div>
          
          <span
            className={`text-sm font-semibold transition-colors duration-300 ${
              isActive ? "text-primary dark:text-white" : "text-gray-500 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-gray-200"
            }`}
          >
            {label}
          </span>
        </div>
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
  const { openModal } = useGlobalModal();
  const mainRef = useRef<HTMLDivElement>(null);
  // @ts-ignore
  const activeColor = accentColors[accentColor]?.default || "#6366f1";
  
  // Reset scroll on route change
  useEffect(() => {
    if (mainRef.current) {
      mainRef.current.scrollTop = 0;
    }
  }, [location.pathname]);

  return (
    <div className="h-[100dvh] w-full flex flex-col bg-body text-primary font-sans md:flex-row transition-colors duration-500 selection:bg-primary/20">
      <LiquidFilter />
      {/* Dynamic Background Aura */}
      <div 
        className="fixed inset-0 z-0 pointer-events-none transition-all duration-1000 ease-in-out"
        style={{
          background: `
            radial-gradient(circle at 0% 0%, ${activeColor}15 0%, transparent 70%),
            radial-gradient(circle at 100% 100%, ${activeColor}10 0%, transparent 70%)
          `
        }}
      />

      {/* Desktop Sidebar (Glass) */}
      <aside className="hidden md:flex flex-col w-72 glass border-r border-subtle h-full p-8 z-20">
        <div className="mb-10 flex items-center gap-3 px-2">
          <div 
            className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-lg"
            style={{ backgroundColor: activeColor }}
          >
            <BarChart3 color="white" size={24} />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-primary dark:text-white">
            Expenses<span className="text-primary" style={{ color: activeColor }}>.</span>
          </h1>
        </div>

        <nav className="flex flex-col space-y-2">
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
        
        <div className="mt-auto p-4 rounded-3xl bg-primary/5 border border-primary/10">
          <p className="text-xs font-bold text-primary/40 uppercase tracking-widest mb-1">Status</p>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: activeColor }} />
            <span className="text-sm font-semibold">Live Updates</span>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main
        ref={mainRef}
        className="flex-1 relative overflow-y-auto no-scrollbar overscroll-none"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        <div
          className={`relative z-10 max-w-2xl mx-auto ${location.pathname === "/chat"
            ? "h-full" 
            : `px-5 pb-32 md:p-12 ${location.pathname === "/history"
              ? "pt-0"
              : "pt-[calc(env(safe-area-inset-top)+2rem)]"
            }`
            }`}
        >
          <ScrollContext.Provider value={mainRef}>
            <AnimatePresence mode="popLayout">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="w-full h-full"
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
          </ScrollContext.Provider>
        </div>
      </main>

      {/* Global Add Expense Modal (Hidden FAB version) */}
      {!location.pathname.startsWith("/admin") && <GlobalAddExpense showFAB={false} />}

      {/* Unified Mobile Bottom Navigation & FAB */}
      <div className="md:hidden fixed bottom-[calc(0.75rem+env(safe-area-inset-bottom))] left-4 right-4 z-50 pointer-events-none flex items-center gap-3 keyboard-hide">
        <div className="flex-1 pointer-events-auto">
          <LiquidNavBar items={NAV_ITEMS} />
        </div>
        <div className="pointer-events-auto shrink-0">
          <LiquidFAB onClick={() => openModal("add")} />
        </div>
      </div>
    </div>
  );
};

export default Layout;
