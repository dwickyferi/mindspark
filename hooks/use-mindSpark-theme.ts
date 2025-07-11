'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTheme } from 'next-themes';
import { ThemeMode, getSystemTheme, applyTheme } from '@/lib/theme';

/**
 * Custom hook for managing MindSpark theme
 */
export function useMindSparkTheme() {
  const { theme: nextTheme, setTheme: setNextTheme, resolvedTheme } = useTheme();
  const [theme, setTheme] = useState<ThemeMode>('light');
  const [systemTheme, setSystemTheme] = useState<ThemeMode>('light');

  // Initialize theme from localStorage or system preference
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const system = getSystemTheme();
      setSystemTheme(system);
      
      // Sync with next-themes
      if (resolvedTheme) {
        setTheme(resolvedTheme as ThemeMode);
        applyTheme(resolvedTheme as ThemeMode);
      } else {
        setTheme(system);
        applyTheme(system);
      }
    }
  }, [resolvedTheme]);

  // Listen for system theme changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      
      const handleChange = (e: MediaQueryListEvent) => {
        const newSystemTheme = e.matches ? 'dark' : 'light';
        setSystemTheme(newSystemTheme);
      };

      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, []);

  // Toggle theme
  const toggleTheme = useCallback(() => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    setNextTheme(newTheme); // Sync with next-themes
    applyTheme(newTheme);
  }, [theme, setNextTheme]);

  // Set specific theme
  const setThemeMode = useCallback((mode: ThemeMode) => {
    setTheme(mode);
    setNextTheme(mode); // Sync with next-themes
    applyTheme(mode);
  }, [setNextTheme]);

  // Reset to system theme
  const resetToSystem = useCallback(() => {
    setTheme(systemTheme);
    setNextTheme('system'); // Use next-themes system mode
    applyTheme(systemTheme);
  }, [systemTheme, setNextTheme]);

  return {
    theme,
    systemTheme,
    toggleTheme,
    setThemeMode,
    resetToSystem,
    isDark: theme === 'dark',
    isLight: theme === 'light',
    isSystemDark: systemTheme === 'dark',
  };
}

/**
 * Theme-aware className utility
 */
export function useThemeClasses() {
  const { theme } = useMindSparkTheme();

  const getThemeClass = useCallback((lightClass: string, darkClass: string) => {
    return theme === 'light' ? lightClass : darkClass;
  }, [theme]);

  const getThemeStyle = useCallback((lightStyle: Record<string, string>, darkStyle: Record<string, string>) => {
    return theme === 'light' ? lightStyle : darkStyle;
  }, [theme]);

  return {
    getThemeClass,
    getThemeStyle,
    theme,
  };
}
