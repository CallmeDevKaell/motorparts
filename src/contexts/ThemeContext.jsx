import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

const ThemeContext = createContext(null);

const getInitialTheme = () => {
  if (typeof window === 'undefined') {
    return 'light';
  }

  const savedTheme = window.localStorage.getItem('motor-parts-theme');
  if (savedTheme === 'light' || savedTheme === 'dark') {
    return savedTheme;
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(getInitialTheme);

  useEffect(() => {
    const root = document.documentElement;

    root.classList.remove('theme-light', 'theme-dark');
    root.classList.add(theme === 'dark' ? 'theme-dark' : 'theme-light');

    window.localStorage.setItem('motor-parts-theme', theme);
  }, [theme]);

  const value = useMemo(() => ({
    theme,
    isDarkMode: theme === 'dark',
    toggleTheme: () => setTheme((currentTheme) => currentTheme === 'dark' ? 'light' : 'dark')
  }), [theme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }

  return context;
};