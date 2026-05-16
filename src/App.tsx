import { useEffect, lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import IOSSpinner from "./components/ui/IOSSpinner";

import { ThemeProvider } from "./context/ThemeContext";
import { GlobalModalProvider } from "./context/GlobalModalContext";
import { ExpenseProvider } from "./context/ExpenseContext";

import ReloadPrompt from "./components/ReloadPrompt";
import ErrorBoundary from "./components/ErrorBoundary";

// Critical Static Imports
import Home from "./pages/Home";
import Login from "./pages/Login";

// Lazy Loaded Pages (Heavy/Secondary)
const History = lazy(() => import("./pages/History"));
const Analytics = lazy(() => import("./pages/Analytics"));
const Profile = lazy(() => import("./pages/Profile"));
const Chat = lazy(() => import("./pages/Chat"));
const EventDetail = lazy(() => import("./pages/EventDetail"));
const Admin = lazy(() => import("./pages/Admin"));

function App() {
  // Prevent Zoom on iOS and snap the window viewport back to full screen
  useEffect(() => {
    const handleGestureStart = (e: Event) => {
      e.preventDefault();
    };

    const handleScrollReset = () => {
      if (window.scrollY !== 0) {
        window.scrollTo(0, 0);
      }
    };

    const setVh = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty("--vh", `${vh}px`);
    };

    setVh();
    window.addEventListener("resize", setVh);
    document.addEventListener("gesturestart", handleGestureStart);
    window.addEventListener("scroll", handleScrollReset);

    // Run initial scroll snap on launch
    window.scrollTo(0, 0);

    return () => {
      window.removeEventListener("resize", setVh);
      document.removeEventListener("gesturestart", handleGestureStart);
      window.removeEventListener("scroll", handleScrollReset);
    };
  }, []);

  return (
    <ThemeProvider>
      <ErrorBoundary>
        <ReloadPrompt />
        <BrowserRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
          <AuthProvider>
            <Suspense fallback={
              <div className="flex items-center justify-center h-screen bg-body">
                <IOSSpinner size={40} />
              </div>
            }>
              <Routes>
                <Route path="/login" element={<Login />} />
                {/* Protected Routes */}
                <Route
                  element={
                    <ProtectedRoute>
                    <GlobalModalProvider>
                      <ExpenseProvider>
                        <Layout />
                      </ExpenseProvider>
                    </GlobalModalProvider>
                  </ProtectedRoute>
                  }
                >
                  <Route path="/" element={<Home />} />
                  <Route path="/history" element={<History />} />
                  <Route path="/analytics" element={<Analytics />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/event/:eventId" element={<EventDetail />} />
                  <Route path="/chat" element={<Chat />} />
                  <Route path="/admin" element={<Admin />} />
                </Route>
              </Routes>
            </Suspense>
          </AuthProvider>
        </BrowserRouter>
      </ErrorBoundary>
    </ThemeProvider>
  );
}

export default App;
