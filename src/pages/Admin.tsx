import React, { useState, useEffect, useCallback, useMemo, memo } from "react";
import { collection, getDocs, query, orderBy, doc, writeBatch, Timestamp } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import Card from "../components/Card";
import { LiquidBack } from "../components/ui/LiquidBack";
import { Users, Calendar, BarChart3 } from "lucide-react";
import Analytics from "./Analytics";
import History from "./History";
import { format } from "date-fns";
import { generateEmbedding } from "../services/gemini";

interface AdminUser {
  id: string;
  displayName?: string;
  email?: string;
  photoURL?: string;
  isAdmin?: boolean;
  createdAt?: Timestamp;
}

const Admin = memo(() => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"analytics" | "history">("analytics");
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState("");

  useEffect(() => {
    if (user && user.isAdmin === false) {
      navigate("/");
    }
  }, [user, navigate]);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const usersRef = collection(db, "users");
        const q = query(usersRef, orderBy("createdAt", "desc"));
        const snapshot = await getDocs(q);
        const userList = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as AdminUser[];
        setUsers(userList);
      } catch (err: any) {
        console.error("Error fetching users:", err);
        setError(err.message || "Failed to fetch users");
      } finally {
        setLoading(false);
      }
    };

    if (user?.isAdmin) {
      fetchUsers();
    }
  }, [user]);

  const handleUserClick = useCallback((userId: string) => {
    setSelectedUserId(userId);
    setViewMode("analytics");
  }, []);

  const handleBack = useCallback(() => {
    setSelectedUserId(null);
    setSyncStatus("");
  }, []);

  const handleSyncEmbeddings = useCallback(async (targetUserId: string) => {
    if (!window.confirm("Are you sure you want to generate embeddings for ALL past expenses? This will consume Gemini API quota.")) return;

    setIsSyncing(true);
    setSyncStatus("Fetching expenses...");

    try {
      const expensesRef = collection(db, "users", targetUserId, "expenses");
      const snapshot = await getDocs(expensesRef);
      const expenses = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

      const expensesWithoutEmbeddings = expenses.filter((e: any) => !e.embedding);

      if (expensesWithoutEmbeddings.length === 0) {
        setSyncStatus("All expenses already have embeddings!");
        setIsSyncing(false);
        return;
      }

      setSyncStatus(`Found ${expensesWithoutEmbeddings.length} expenses to sync. Generating...`);

      const BATCH_SIZE = 10;
      for (let i = 0; i < expensesWithoutEmbeddings.length; i += BATCH_SIZE) {
        const batch = expensesWithoutEmbeddings.slice(i, i + BATCH_SIZE);
        const firestoreBatch = writeBatch(db);

        setSyncStatus(`Processing batch ${Math.floor(i / BATCH_SIZE) + 1} of ${Math.ceil(expensesWithoutEmbeddings.length / BATCH_SIZE)}...`);

        await Promise.all(batch.map(async (expense: any) => {
          let dateObj = new Date();
          if (expense.date instanceof Timestamp) {
            dateObj = expense.date.toDate();
          } else if (expense.date) {
            dateObj = new Date(expense.date);
          }
          const expenseString = `Spent ${expense.amount} on ${expense.category} on ${format(dateObj, "yyyy-MM-dd")}. Note: ${expense.note || ''}`;
          const embedding = await generateEmbedding(expenseString);

          if (embedding) {
            const docRef = doc(db, "users", targetUserId, "expenses", expense.id);
            firestoreBatch.update(docRef, { embedding });
          }
        }));

        await firestoreBatch.commit();
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      setSyncStatus("✅ Successfully synced all historical embeddings!");
    } catch (error) {
      console.error("Embedding sync error:", error);
      setSyncStatus("❌ Error syncing embeddings. Check console.");
    } finally {
      setIsSyncing(false);
    }
  }, []);

  const selectedUser = useMemo(() =>
    users.find((u) => u.id === selectedUserId),
    [users, selectedUserId]
  );

  if (!user?.isAdmin) return null;

  if (selectedUserId) {
    return (
      <div className="pb-20 pt-4 animate-in slide-in-from-right duration-300">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <LiquidBack onClick={handleBack} />
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Viewing: {selectedUser?.displayName || "User"}
              </h2>
              <div className="flex items-center gap-4">
                <p className="text-xs text-gray-400">{selectedUser?.email}</p>
                <button
                  onClick={() => handleSyncEmbeddings(selectedUserId)}
                  disabled={isSyncing}
                  className="text-xs bg-accent/10 text-accent hover:bg-accent hover:text-white px-2 py-0.5 rounded transition-colors disabled:opacity-50"
                >
                  {isSyncing ? 'Syncing...' : 'Sync Embeddings'}
                </button>
              </div>
            </div>
          </div>

          <div className="flex bg-gray-100 dark:bg-white/5 p-1 rounded-xl">
            <button
              onClick={() => setViewMode("analytics")}
              className={`p-2 rounded-lg transition-all ${viewMode === "analytics"
                ? "bg-white dark:bg-black shadow-sm text-accent"
                : "text-gray-400"
                }`}
            >
              <BarChart3 size={20} />
            </button>
            <button
              onClick={() => setViewMode("history")}
              className={`p-2 rounded-lg transition-all ${viewMode === "history"
                ? "bg-white dark:bg-black shadow-sm text-accent"
                : "text-gray-400"
                }`}
            >
              <Calendar size={20} />
            </button>
          </div>
        </div>

        {syncStatus && (
          <div className="mb-4 text-sm font-medium text-accent bg-accent/5 p-3 rounded-xl border border-accent/10 text-center animate-in fade-in">
            {syncStatus}
          </div>
        )}

        <div key={viewMode} className="animate-in fade-in duration-300">
          {viewMode === "analytics" ? (
            <Analytics userId={selectedUserId} readOnly={true} />
          ) : (
            <History userId={selectedUserId} readOnly={true} />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="pt-[calc(env(safe-area-inset-top)+2rem)] pb-32 space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white">
          Admin
        </h1>
        <span className="text-sm font-medium text-gray-500 bg-gray-100 dark:bg-white/5 px-3 py-1 rounded-full">
          {users.length} Users
        </span>
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400">
          <p className="font-bold">Error:</p>
          <p className="text-sm">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid gap-4">
          {users.map((u) => (
            <Card
              key={u.id}
              onClick={() => handleUserClick(u.id)}
              className="flex items-center justify-between group hover:border-accent/50 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-white/5 overflow-hidden flex items-center justify-center text-gray-400">
                  {u.photoURL ? (
                    <img
                      src={u.photoURL}
                      alt={u.displayName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Users size={24} />
                  )}
                </div>
                <div className="text-left">
                  <h3 className="font-bold text-gray-900 dark:text-white">
                    {u.displayName || "Unknown User"}
                  </h3>
                  <p className="text-sm text-gray-400">{u.email}</p>
                </div>
              </div>
              <div className="text-right">
                {u.isAdmin && (
                  <span className="text-xs font-bold text-accent bg-accent/10 px-2 py-1 rounded-md">
                    ADMIN
                  </span>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
});

Admin.displayName = "Admin";

export default Admin;