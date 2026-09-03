// utils/useTheme.ts
import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { THEMES , ThemeName  } from '../constants/themes';


export function useTheme() {
  const [themeId, setThemeId] = useState<ThemeName>('light');
  const [theme, setTheme] = useState(THEMES.light);

  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      const saved = await AsyncStorage.getItem('appTheme') as ThemeName;
      if (saved && THEMES[saved]) {
        setThemeId(saved);
        setTheme(THEMES[saved]);
      }
    } catch (e) {
      console.log('No saved theme, using light');
    }
  };

  const setAppTheme = async (id: ThemeName) => {
    setThemeId(id);
    setTheme(THEMES[id]);
    await AsyncStorage.setItem('appTheme', id);
  };

  return { theme, themeId, setAppTheme };
}