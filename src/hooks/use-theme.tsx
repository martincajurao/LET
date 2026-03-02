'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface ThemeContextType {
  isDark: boolean;
  toggleDarkMode: () => void;
  setDarkMode: (isDark: boolean) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  isDark: true, // Default to true
  toggleDarkMode: () => {},
  setDarkMode: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [isDark, setIsDark] = useState(true); // Default to dark
  const [mounted, setMounted] = useState(false);

  // Check preference and localStorage on mount
  useEffect(() => {
    const checkDarkMode = () => {
      const storedDarkMode = localStorage.getItem('darkMode');
      
      // Default to dark if no preference is stored (storedDarkMode === null)
      // Otherwise use the stored preference
      const darkMode = storedDarkMode !== 'false';
      
      setIsDark(darkMode);
      
      if (darkMode) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    };
    
    checkDarkMode();
    setMounted(true);
    
    // Listen for system preference changes (optional, but keep for completeness)
    if (window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = (e: MediaQueryListEvent) => {
        // Only auto-switch if user hasn't set a preference manually
        if (localStorage.getItem('darkMode') === null) {
          setIsDark(e.matches);
          if (e.matches) {
            document.documentElement.classList.add('dark');
          } else {
            document.documentElement.classList.remove('dark');
          }
        }
      };
      
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, []);

  const toggleDarkMode = () => {
    const newDark = !isDark;
    setIsDark(newDark);
    
    if (newDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('darkMode', 'true');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('darkMode', 'false');
    }
  };

  const setDarkMode = (dark: boolean) => {
    setIsDark(dark);
    
    if (dark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('darkMode', 'true');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('darkMode', 'false');
    }
  };

  // Prevent flash of wrong theme by waiting for mount
  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <ThemeContext.Provider value={{ isDark, toggleDarkMode, setDarkMode }}>
      {children}
    </ThemeContext.Provider>
  );
}
