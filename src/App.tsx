import { useEffect, lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";

import { ThemeProvider } from "./context/ThemeContext";

import ReloadPrompt from "./components/ReloadPrompt";
import NotificationManager from "./components/NotificationManager";
import ErrorBoundary from "./components/ErrorBoundary";

import SplashScreen from "./components/SplashScreen";
import { useState } from "react";
import IOSSpinner from "./components/ui/IOSSpinner";

// Lazy Load Pages
const Home = lazy(() => import("./pages/Home"));
const History = lazy(() => import("./pages/History"));
const Analytics = lazy(() => import("./pages/Analytics"));
const Admin = lazy(() => import("./pages/Admin"));
const Login = lazy(() => import("./pages/Login"));
const Profile = lazy(() => import("./pages/Profile"));

const LoadingFallback = () => (
  <div className="flex h-screen w-full items-center justify-center bg-body">
    <IOSSpinner size={32} color="var(--text-tertiary)" />
  </div>
);

function App() {
  const [loading, setLoading] = useState(true);

  // Prevent Zoom on iOS
  useEffect(() => {
    const handleGestureStart = (e: Event) => {
      e.preventDefault();
    };

    document.addEventListener("gesturestart", handleGestureStart);

    return () => {
      document.removeEventListener("gesturestart", handleGestureStart);
    };
  }, []);

  return (
    <ThemeProvider>
      {loading ? (
        <SplashScreen onComplete={() => setLoading(false)} />
      ) : (
        <ErrorBoundary>
          <ReloadPrompt />
          <BrowserRouter>
            <AuthProvider>
              <NotificationManager />
              <Suspense fallback={<LoadingFallback />}>
                <Routes>
                  <Route path="/login" element={<Login />} />
                  {/* Protected Routes */}
                  <Route
                    element={
                      <ProtectedRoute>
                        <Layout />
                      </ProtectedRoute>
                    }
                  >
                    <Route path="/" element={<Home />} />
                    <Route path="/history" element={<History />} />
                    <Route path="/analytics" element={<Analytics />} />
                    <Route path="/profile" element={<Profile />} />
                    <Route path="/admin" element={<Admin />} />
                  </Route>
                </Routes>
              </Suspense>
            </AuthProvider>
          </BrowserRouter>
        </ErrorBoundary>
      )}
    </ThemeProvider>
  );
}

export default App;
