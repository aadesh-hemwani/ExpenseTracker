import { useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";

import { ThemeProvider } from "./context/ThemeContext";
import { GlobalModalProvider } from "./context/GlobalModalContext";

import ReloadPrompt from "./components/ReloadPrompt";
import ErrorBoundary from "./components/ErrorBoundary";

import SplashScreen from "./components/SplashScreen";
import { useState } from "react";

// Static Imports
import Home from "./pages/Home";
import History from "./pages/History";
import Analytics from "./pages/Analytics";
import Admin from "./pages/Admin";
import Login from "./pages/Login";
import Profile from "./pages/Profile";

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
              <Routes>
                <Route path="/login" element={<Login />} />
                {/* Protected Routes */}
                <Route
                  element={
                    <ProtectedRoute>
                      <GlobalModalProvider>
                        <Layout />
                      </GlobalModalProvider>
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
            </AuthProvider>
          </BrowserRouter>
        </ErrorBoundary>
      )}
    </ThemeProvider>
  );
}

export default App;
