'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/lib/theme-context';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="relative inline-flex h-7 w-14 items-center rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 bg-gray-200 dark:bg-gray-700"
      aria-label={theme === 'light' ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro'}
      title={theme === 'light' ? 'Modo oscuro' : 'Modo claro'}
    >
      {/* Toggle circle */}
      <span
        className={`inline-flex h-6 w-6 transform items-center justify-center rounded-full bg-white shadow-lg transition-transform duration-300 ${
          theme === 'dark' ? 'translate-x-7' : 'translate-x-1'
        }`}
      >
        {theme === 'light' ? (
          <Sun className="h-4 w-4 text-yellow-500" />
        ) : (
          <Moon className="h-4 w-4 text-blue-500" />
        )}
      </span>

      {/* Background icons */}
      <span className="absolute left-1.5 top-1">
        <Sun className="h-4 w-4 text-yellow-600 dark:text-gray-500" />
      </span>
      <span className="absolute right-1.5 top-1">
        <Moon className="h-4 w-4 text-gray-400 dark:text-blue-400" />
      </span>
    </button>
  );
}

// Made with Bob
