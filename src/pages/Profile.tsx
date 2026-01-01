import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { db } from "../firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import {
  LogOut,
  Save,
  User as UserIcon,
  ShieldCheck,
  Wallet,
  Moon,
  Sun,
  Palette,
  Check,
} from "lucide-react";
import { motion } from "framer-motion";
import Card from "../components/Card";

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

const Profile = () => {
  const { user, logOut } = useAuth();
  const { theme, toggleTheme, accentColor, setAccentColor, accentColors } =
    useTheme();
  const [budget, setBudget] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  // Fetch current budget from Firestore on mount
  useEffect(() => {
    const fetchUserData = async () => {
      if (user?.uid) {
        const userRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(userRef);
        if (docSnap.exists()) {
          setBudget(docSnap.data().monthlyBudgetCap?.toString() || "");
        }
      }
    };
    fetchUserData();
  }, [user]);

  // Handle Budget Update
  const handleSaveBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.uid) return;
    setLoading(true);
    setMessage("");

    try {
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        monthlyBudgetCap: Number(budget),
      });
      setMessage("Budget updated successfully.");

      // Clear success message after 3 seconds
      setTimeout(() => setMessage(""), 3000);
    } catch (error) {
      console.error("Error updating budget:", error);
      setMessage("Failed to update budget.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logOut();
      // Router will auto-redirect to login due to ProtectedRoute
    } catch (error) {
      console.error("Failed to log out", error);
    }
  };

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="pt-4 max-w-lg mx-auto"
    >
      {/* Header */}
      <motion.h1
        variants={item}
        className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white mb-8"
      >
        Profile
      </motion.h1>

      {/* User Card */}
      <motion.div variants={item}>
        <Card className="flex flex-col items-center text-center mb-6">
          <div className="relative mb-4">
            {user?.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.displayName || "User"}
                className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-lg"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-accent/20 flex items-center justify-center border-4 border-white dark:border-gray-900 shadow-lg">
                <UserIcon className="w-10 h-10 text-accent" />
              </div>
            )}
            <div className="absolute bottom-0 right-0 bg-green-500 w-6 h-6 rounded-full border-4 border-white dark:border-gray-900"></div>
          </div>

          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {user?.displayName}
          </h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            {user?.email}
          </p>

          <div className="mt-4 flex items-center gap-2 px-3 py-1 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-xs font-semibold rounded-full border border-green-100 dark:border-green-900/30">
            <ShieldCheck className="w-3 h-3" />
            <span>Google Verified</span>
          </div>
        </Card>
      </motion.div>

      {/* Settings Section */}
      <motion.div variants={item} className="space-y-6">
        {/* Appearance Settings */}
        <Card>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-indigo-50 dark:bg-gray-900 rounded-lg text-accent">
              <Palette className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              Appearance
            </h3>
          </div>

          {/* Dark Mode Toggle */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div
                className={`p-2 rounded-full ${
                  theme === "dark"
                    ? "bg-gray-900 text-yellow-400"
                    : "bg-yellow-100 text-yellow-600"
                }`}
              >
                {theme === "dark" ? (
                  <Moon className="w-5 h-5" />
                ) : (
                  <Sun className="w-5 h-5" />
                )}
              </div>
              <div>
                <p className="font-semibold text-gray-900 dark:text-white">
                  Dark Mode
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Adjust the appearance to reduce glare.
                </p>
              </div>
            </div>
            <button
              onClick={toggleTheme}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 ${
                theme === "dark" ? "bg-accent" : "bg-gray-200"
              }`}
            >
              <span
                className={`${
                  theme === "dark" ? "translate-x-6" : "translate-x-1"
                } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
              />
            </button>
          </div>

          {/* Accent Color Picker */}
          <div>
            <label className="block text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">
              Accent Color
            </label>
            <div className="flex flex-wrap gap-3">
              {Object.entries(accentColors).map(([key, colors]) => (
                <button
                  key={key}
                  // @ts-ignore
                  onClick={() => setAccentColor(key)}
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-transform hover:scale-110 ${
                    accentColor === key
                      ? "ring-2 ring-offset-2 ring-gray-400 dark:ring-gray-500 scale-110"
                      : ""
                  }`}
                  // @ts-ignore
                  style={{ backgroundColor: colors.default }}
                  aria-label={`Select ${key} accent color`}
                >
                  {accentColor === key && (
                    <Check className="w-5 h-5 text-white" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </Card>

        {/* Budget Setting */}
        <Card>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-accent/10 rounded-lg text-accent">
              <Wallet className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              Monthly Budget
            </h3>
          </div>

          <form onSubmit={handleSaveBudget}>
            <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
              Spending Cap (₹)
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                placeholder="Ex: 25000"
                className="w-full min-w-0 appearance-none bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl p-2 text-base font-semibold text-gray-900 dark:text-white focus:ring-0 focus:border-white/20 focus:outline-none transition-colors"
              />
              <button
                type="submit"
                disabled={loading}
                className="bg-black dark:bg-white text-white dark:text-black px-6 rounded-xl font-medium hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {loading ? "..." : <Save className="w-4 h-4" />}
                {loading ? "" : "Save"}
              </button>
            </div>
            {message && (
              <p
                className={`text-xs mt-3 ${
                  message.includes("Failed") ? "text-red-500" : "text-green-600"
                } font-medium`}
              >
                {message}
              </p>
            )}
          </form>
        </Card>

        {/* Danger Zone / Logout */}
        <button
          onClick={handleLogout}
          className="w-full p-4 flex items-center justify-center gap-2 text-red-600 font-bold bg-red-50 dark:bg-red-900/10 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-2xl transition-colors"
        >
          <LogOut className="w-5 h-5" />
          Sign Out
        </button>
      </motion.div>

      <motion.p
        variants={item}
        className="text-center text-xs text-gray-300 dark:text-gray-600 pt-4"
      >
        Version 1.0.0 • Expense Tracker PWA
      </motion.p>
    </motion.div>
  );
};

export default Profile;
