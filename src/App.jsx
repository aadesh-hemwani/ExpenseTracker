import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import History from './pages/History';
import Analytics from './pages/Analytics';
import { AuthProvider } from './context/AuthContext';
import Login from './pages/Login';
import ProtectedRoute from './components/ProtectedRoute';
import Profile from './pages/Profile';

import { ThemeProvider } from './context/ThemeContext';

function App() {
    // Prevent Zoom on iOS
    useEffect(() => {
        const handleGestureStart = (e) => {
            e.preventDefault();
        };

        document.addEventListener('gesturestart', handleGestureStart);

        return () => {
            document.removeEventListener('gesturestart', handleGestureStart);
        };
    }, []);
    return (
        <ThemeProvider>
            <AuthProvider>
                <BrowserRouter>
                    <Routes>
                        <Route path="/login" element={<Login />} />
                        {/* Protected Routes */}
                        <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                            <Route path="/" element={<Home />} />
                            <Route path="/history" element={<History />} />
                            <Route path="/analytics" element={<Analytics />} />
                            <Route path="/profile" element={<Profile />} />
                        </Route>
                    </Routes>
                </BrowserRouter>
            </AuthProvider>
        </ThemeProvider>
    );
}

export default App;