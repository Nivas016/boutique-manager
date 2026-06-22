import React, { createContext, useContext, useState, useEffect } from 'react';
import { Colors, THEMES, ThemeName } from '../constants/colors';
import { getSetting, setSetting } from '../db/settings';

interface ThemeContextType {
  theme: ThemeName;
  setTheme: (t: ThemeName) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'peacock',
  setTheme: async () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeName>('peacock');

  useEffect(() => {
    getSetting('app_theme').then((t) => {
      if (t === 'peacock' || t === 'atelier') {
        Object.assign(Colors, THEMES[t]);
        setThemeState(t);
      }
    }).catch(() => {});
  }, []);

  const setTheme = async (t: ThemeName) => {
    Object.assign(Colors, THEMES[t]);
    setThemeState(t);
    await setSetting('app_theme', t);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
