'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from 'react';

// Theme type
export type Theme = 'dark' | 'light';

// Context interface
interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  slug: string | null;
}

// Create context
const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

// Storage key prefix
const STORAGE_KEY_PREFIX = 'app_session_';

// Helper to get theme from localStorage
function getStoredTheme(slug: string | null): Theme {
  if (typeof window === 'undefined') return 'dark';
  
  // Try to get theme from app-specific preferences first
  if (slug) {
    const savedPrefs = localStorage.getItem(`${STORAGE_KEY_PREFIX}${slug}_prefs`);
    if (savedPrefs) {
      try {
        const parsed = JSON.parse(savedPrefs);
        if (parsed.theme === 'light' || parsed.theme === 'dark') {
          return parsed.theme;
        }
      } catch {
        // Ignore parse errors
      }
    }
  }
  
  // Fallback to global theme preference
  const globalTheme = localStorage.getItem('zeusx_theme');
  if (globalTheme === 'light' || globalTheme === 'dark') {
    return globalTheme;
  }
  
  return 'dark';
}

// Helper to apply theme class to documentElement
function applyThemeClass(theme: Theme) {
  if (typeof document === 'undefined') return;
  
  const root = document.documentElement;
  if (theme === 'dark') {
    root.classList.add('dark');
    root.classList.remove('light');
  } else {
    root.classList.add('light');
    root.classList.remove('dark');
  }
}

// ThemeProvider component
export function ThemeProvider({ 
  children, 
  slug 
}: { 
  children: React.ReactNode;
  slug: string | null;
}) {
  const [theme, setThemeState] = useState<Theme>('dark');
  const [mounted, setMounted] = useState(false);

  // Initialize theme from localStorage on mount
  useEffect(() => {
    const initialTheme = getStoredTheme(slug);
    setThemeState(initialTheme);
    applyThemeClass(initialTheme);
    setMounted(true);
  }, [slug]);

  // Listen for theme changes from other tabs
  useEffect(() => {
    if (!slug) return;

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === `${STORAGE_KEY_PREFIX}${slug}_prefs` || e.key === 'zeusx_theme') {
        const newTheme = getStoredTheme(slug);
        setThemeState(newTheme);
        applyThemeClass(newTheme);
      }
    };

    const handleThemeChangeEvent = () => {
      const newTheme = getStoredTheme(slug);
      setThemeState(newTheme);
      applyThemeClass(newTheme);
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('theme-change', handleThemeChangeEvent);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('theme-change', handleThemeChangeEvent);
    };
  }, [slug]);

  // Set theme function
  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
    applyThemeClass(newTheme);
    
    // Save to localStorage
    if (typeof window !== 'undefined') {
      if (slug) {
        const savedPrefs = localStorage.getItem(`${STORAGE_KEY_PREFIX}${slug}_prefs`);
        if (savedPrefs) {
          try {
            const parsed = JSON.parse(savedPrefs);
            parsed.theme = newTheme;
            localStorage.setItem(`${STORAGE_KEY_PREFIX}${slug}_prefs`, JSON.stringify(parsed));
          } catch {
            localStorage.setItem(`${STORAGE_KEY_PREFIX}${slug}_prefs`, JSON.stringify({ theme: newTheme }));
          }
        } else {
          localStorage.setItem(`${STORAGE_KEY_PREFIX}${slug}_prefs`, JSON.stringify({ theme: newTheme }));
        }
      } else {
        localStorage.setItem('zeusx_theme', newTheme);
      }
      
      // Dispatch custom event for same-tab updates
      window.dispatchEvent(new CustomEvent('theme-change'));
    }
  }, [slug]);

  const value = useMemo(
    () => ({ theme, setTheme, slug }),
    [theme, setTheme, slug]
  );

  // Avoid hydration mismatch
  if (!mounted) {
    return (
      <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
    );
  }

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

// Hook to use theme
export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return ctx;
}