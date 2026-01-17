import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import LogOutOutline from "react-ionicons/lib/LogOutOutline";
import SaveOutline from "react-ionicons/lib/SaveOutline";
import Person from "react-ionicons/lib/Person";
import WalletOutline from "react-ionicons/lib/WalletOutline";
import ColorPaletteOutline from "react-ionicons/lib/ColorPaletteOutline";
import Checkmark from "react-ionicons/lib/Checkmark";
import ShieldCheckmarkOutline from "react-ionicons/lib/ShieldCheckmarkOutline";
import MoonOutline from "react-ionicons/lib/MoonOutline";
import SunnyOutline from "react-ionicons/lib/SunnyOutline";
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
  const navigate = useNavigate();
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
                <Person
                  color="var(--color-accent)"
                  height="40px"
                  width="40px"
                  cssClasses="text-accent"
                />
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

          {user?.isAdmin && (
            <button
              onClick={() => navigate("/admin")}
              className="mt-4 px-4 py-1.5 bg-accent/20 text-gray-900 dark:text-white rounded-full text-xs font-bold border border-gray-200 dark:border-white/10 hover:bg-gray-200 dark:hover:bg-white/20 transition-all"
            >
              Admin Dashboard
            </button>
          )}

          <div className="mt-3 flex items-center gap-1.5 px-2.5 py-0.5 bg-green-500/20 dark:bg-green-900/40 text-green-800 dark:text-green-600 text-[10px] font-medium rounded-full border border-gray-100 dark:border-white/5">
            <ShieldCheckmarkOutline
              height="12px"
              width="12px"
              color="currentColor"
            />
            <span>Google Verified</span>
          </div>
        </Card>
      </motion.div>

      {/* Settings Section */}
      <motion.div variants={item} className="space-y-6 pb-32">
        {/* Appearance Settings */}
        <Card>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-500/10 rounded-lg text-indigo-600 dark:text-indigo-400">
              <ColorPaletteOutline
                height="20px"
                width="20px"
                color="currentColor"
              />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              Appearance
            </h3>
          </div>

          {/* Dark Mode Toggle */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div
                className={`p-2 rounded-full transition-colors ${
                  theme === "dark"
                    ? "bg-gray-800 text-yellow-400"
                    : "bg-yellow-100 text-yellow-600"
                }`}
              >
                {theme === "dark" ? (
                  <MoonOutline
                    height="20px"
                    width="20px"
                    color="currentColor"
                  />
                ) : (
                  <SunnyOutline
                    height="20px"
                    width="20px"
                    color="currentColor"
                  />
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
            <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-4">
              Accent Color{" "}
              <span className="text-gray-900 dark:text-white ml-1 font-normal opacity-60">
                • {accentColors[accentColor]?.name || "Custom"}
              </span>
            </label>
            <div className="flex flex-wrap gap-4">
              {Object.entries(accentColors).map(([key, colors]) => (
                <button
                  key={key}
                  // @ts-ignore
                  onClick={() => setAccentColor(key)}
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-110 ${
                    accentColor === key
                      ? "ring-2 ring-offset-2 ring-gray-900 dark:ring-white scale-110 shadow-md"
                      : "ring-1 ring-black/5 dark:ring-white/10"
                  }`}
                  // @ts-ignore
                  style={{ backgroundColor: colors.default }}
                  aria-label={`Select ${colors.name} accent color`}
                  title={colors.name}
                >
                  {accentColor === key && (
                    <Checkmark color="#ffffff" height="20px" width="20px" />
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
              <WalletOutline height="20px" width="20px" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              Monthly Budget
            </h3>
          </div>

          <form onSubmit={handleSaveBudget}>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider">
                Spending Cap (₹)
              </label>
              <button
                type="button"
                onClick={async () => {
                  setLoading(true);
                  try {
                    // 1. Fetch recent expenses (last 90 days roughly)
                    // Ideally we use a proper hook, but for this "one-off" action, direct query is fine
                    const {
                      collection,
                      query,
                      where,
                      orderBy,
                      limit,
                      getDocs,
                    } = await import("firebase/firestore");
                    const q = query(
                      collection(db, "users", user?.uid || "", "expenses"),
                      // orderBy("date", "desc"), // Sorting done client-side for safety/speed
                      limit(300) // Fetch ~3 months of data
                    );

                    console.log(
                      `🪄 Auto-Budget: Fetching for user ${user?.uid}...`
                    );
                    const snapshot = await getDocs(q);
                    console.log(
                      `🪄 Auto-Budget: Found ${snapshot.size} transactions.`
                    );

                    let expenses = snapshot.docs.map((d) => d.data());

                    // Client-side sort by date (descending) since we can't do it in query
                    expenses.sort((a, b) => {
                      const dateA = a.date?.toDate
                        ? a.date.toDate()
                        : new Date(a.date);
                      const dateB = b.date?.toDate
                        ? b.date.toDate()
                        : new Date(b.date);
                      return dateB.getTime() - dateA.getTime();
                    });

                    // Debug total before sending
                    const localTotal = expenses.reduce(
                      (sum, e) => sum + Number(e.amount || 0),
                      0
                    );
                    console.log(
                      `🪄 Auto-Budget: Calculated Total: ${localTotal}`
                    );

                    if (expenses.length === 0) {
                      setMessage("No transaction history found to analyze.");
                      setLoading(false);
                      return;
                    }

                    // 2. Get Recommendation
                    const { calculateRecommendedBudget } = await import(
                      "../services/gemini"
                    );
                    // @ts-ignore
                    const rec = await calculateRecommendedBudget(expenses);

                    if (rec) {
                      setBudget(rec.recommendedBudget.toString());
                      setMessage(
                        `✨ AI Suggestion: ₹${rec.recommendedBudget}\n${rec.reasoning}`
                      );
                    } else {
                      setMessage("Could not generate a suggestion.");
                    }
                  } catch (e) {
                    console.error(e);
                    setMessage("Failed to analyze data.");
                  } finally {
                    setLoading(false);
                  }
                }}
                className="text-xs flex items-center gap-1 text-indigo-500 font-bold hover:text-indigo-600 transition-colors"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-3 w-3"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM12 2a1 1 0 01.967.744L14.146 7.2 17.5 9.134a1 1 0 010 1.732l-3.354 1.935-1.18 4.455a1 1 0 01-1.933 0L9.854 12.8 6.5 10.866a1 1 0 010-1.732l3.354-1.935 1.18-4.455A1 1 0 0112 2z"
                    clipRule="evenodd"
                  />
                </svg>
                Auto-Calculate
              </button>
            </div>
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
                {loading ? "..." : <SaveOutline height="16px" width="16px" />}
                {loading ? "" : "Save"}
              </button>
            </div>
            {message && (
              <p
                className={`text-xs mt-3 ${
                  message.includes("Failed") ? "text-red-500" : "text-green-600"
                } font-medium whitespace-pre-wrap leading-relaxed`}
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
          <LogOutOutline height="20px" width="20px" />
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
