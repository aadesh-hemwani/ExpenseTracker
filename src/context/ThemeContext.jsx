import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
    const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');
    const [accentColor, setAccentColor] = useState(() => localStorage.getItem('accentColor') || 'indigo');

    // Define accent colors map - using Tailwind colors for reference
    const accentColors = {
        indigo: { default: '#6366f1', hover: '#4f46e5' },
        emerald: { default: '#10b981', hover: '#059669' },
        rose: { default: '#f43f5e', hover: '#e11d48' },
        amber: { default: '#f59e0b', hover: '#d97706' },
        violet: { default: '#8b5cf6', hover: '#7c3aed' },
        cyan: { default: '#06b6d4', hover: '#0891b2' },
    };

    useEffect(() => {
        const root = window.document.documentElement;

        // Apply Theme
        root.classList.remove('light', 'dark');
        root.classList.add(theme);
        localStorage.setItem('theme', theme);

        // Apply Accent Color
        const colors = accentColors[accentColor] || accentColors.indigo;
        root.style.setProperty('--color-accent', colors.default);
        root.style.setProperty('--color-accent-hover', colors.hover);
        localStorage.setItem('accentColor', accentColor);

    }, [theme, accentColor]);

    const toggleTheme = () => {
        setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
    };

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme, accentColor, setAccentColor, accentColors }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};
