import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { THEMES, ThemeName } from '../constants/themes';

type AnyTheme = typeof THEMES[ThemeName];

type ThemeContextType = {
  theme: AnyTheme;
  themeId: ThemeName;
  setAppTheme: (id: ThemeName) => Promise<void>;
};

const ThemeContext = createContext<ThemeContextType>({
  theme: THEMES.light as AnyTheme,
  themeId: 'light',
  setAppTheme: async () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeId, setThemeId] = useState<ThemeName>('light');
  const [theme, setTheme] = useState<AnyTheme>(THEMES.light as AnyTheme);

  useEffect(() => {
    AsyncStorage.getItem('appTheme').then(saved => {
      if (saved && THEMES[saved as ThemeName]) {
        setThemeId(saved as ThemeName);
        setTheme(THEMES[saved as ThemeName] as AnyTheme);
      }
    });
  }, []);

  const setAppTheme = async (id: ThemeName) => {
    setThemeId(id);
    setTheme(THEMES[id] as AnyTheme);
    await AsyncStorage.setItem('appTheme', id);
  };

  return (
    <ThemeContext.Provider value={{ theme, themeId, setAppTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useAppTheme = () => useContext(ThemeContext);
