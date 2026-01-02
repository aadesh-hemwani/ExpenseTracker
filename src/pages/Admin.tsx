import { useState, useEffect } from "react";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import Card from "../components/Card";
import { ArrowLeft, User as UserIcon, Calendar, BarChart2 } from "lucide-react";
import Analytics from "./Analytics";
import History from "./History";

const Admin = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"analytics" | "history">(
    "analytics"
  );

  // Protect the route
  useEffect(() => {
    if (user && user.isAdmin === false) {
      navigate("/");
    }
  }, [user, navigate]);

  // Fetch Users
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const usersRef = collection(db, "users");
        const q = query(usersRef, orderBy("createdAt", "desc"));
        const snapshot = await getDocs(q);
        const userList = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
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

  const handleUserClick = (userId: string) => {
    setSelectedUserId(userId);
    setViewMode("analytics");
  };

  const handleBack = () => {
    setSelectedUserId(null);
  };

  if (!user?.isAdmin) {
    return null; // Or a loading spinner while redirecting
  }

  // --- IMPERSONATION VIEW ---
  if (selectedUserId) {
    const selectedUser = users.find((u) => u.id === selectedUserId);

    return (
      <div className="pb-20 pt-4 animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={handleBack}
              className="p-2 bg-white dark:bg-black border border-gray-200 dark:border-gray-800 rounded-full hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Viewing: {selectedUser?.displayName || "User"}
              </h2>
              <p className="text-xs text-gray-400">{selectedUser?.email}</p>
            </div>
          </div>

          {/* View Switcher */}
          <div className="flex bg-gray-100 dark:bg-white/5 p-1 rounded-xl">
            <button
              onClick={() => setViewMode("analytics")}
              className={`p-2 rounded-lg transition-all ${
                viewMode === "analytics"
                  ? "bg-white dark:bg-black shadow-sm text-accent"
                  : "text-gray-400"
              }`}
            >
              <BarChart2 className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode("history")}
              className={`p-2 rounded-lg transition-all ${
                viewMode === "history"
                  ? "bg-white dark:bg-black shadow-sm text-accent"
                  : "text-gray-400"
              }`}
            >
              <Calendar className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
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

  // --- USER LIST VIEW ---
  return (
    <div className="pt-4 pb-20 space-y-6 animate-in fade-in duration-500">
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
              as="button"
              onClick={() => handleUserClick(u.id)}
              className="flex items-center justify-between group hover:border-accent/50 transition-colors"
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
                    <UserIcon className="w-6 h-6" />
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
};

export default Admin;
