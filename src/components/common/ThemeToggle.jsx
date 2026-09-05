import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';

const ThemeToggle = () => {
  const { isDarkMode, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="theme-toggle fixed bottom-5 right-5 z-[100] flex items-center gap-3 rounded-full border border-slate-200/80 bg-white/90 px-4 py-3 text-sm font-semibold text-slate-800 shadow-xl shadow-slate-300/30 backdrop-blur transition duration-300 hover:-translate-y-0.5 hover:shadow-2xl"
      aria-label={`Switch to ${isDarkMode ? 'light' : 'dark'} mode`}
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-base text-white">
        {isDarkMode ? '☀️' : '🌙'}
      </span>
      <span>{isDarkMode ? 'Light Mode' : 'Dark Mode'}</span>
    </button>
  );
};

export default ThemeToggle;