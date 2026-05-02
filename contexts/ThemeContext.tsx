import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Noah palette — inspired by Noah Webster's blue-backed speller and the
// embossed-gold lettering of Merriam-Webster dictionaries. Navy + gold + cream.
const COLORS = {
  light: {
    background: '#FAF7F0',        // parchment / aged paper
    surface: '#FFFFFF',
    surfaceVariant: '#F0EBD8',    // warm cream
    primary: '#1B365D',           // Webster navy
    primaryContainer: '#E0E7F1',  // pale blue
    onPrimary: '#FFFFFF',
    onSurface: '#1B365D',         // dark navy text
    onSurfaceVariant: '#5A6B7A',  // muted slate
    outline: '#D4C9A0',           // parchment edge
    accent: '#C9A04A',            // embossed-cover gold
    accentContainer: '#F5E9C7',
    onAccent: '#1B365D',
    error: '#B91C1C',
    success: '#15803D',
    warning: '#B7791F',
    info: '#1B365D',
  },
  dark: {
    background: '#0F1B2D',        // deep library-at-night navy
    surface: '#1B365D',           // Webster navy
    surfaceVariant: '#2A4870',
    primary: '#DAB562',           // gold leads in dark mode
    primaryContainer: '#2A4870',
    onPrimary: '#0F1B2D',
    onSurface: '#FAF7F0',         // cream text
    onSurfaceVariant: '#A8B5C4',
    outline: '#3B5A82',
    accent: '#DAB562',
    accentContainer: '#3B2F1A',
    onAccent: '#0F1B2D',
    error: '#FCA5A5',
    success: '#86EFAC',
    warning: '#FBBF24',
    info: '#93C5FD',
  },
};

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemColorScheme = useColorScheme();
  const [theme, setThemeState] = useState<Theme>(systemColorScheme === 'dark' ? 'dark' : 'light');

  useEffect(() => {
    if (systemColorScheme) {
      setThemeState(systemColorScheme);
    }
  }, [systemColorScheme]);

  const toggleTheme = () => {
    setThemeState(prev => prev === 'light' ? 'dark' : 'light');
  };

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

export { COLORS };
