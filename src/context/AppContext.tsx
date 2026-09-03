import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Font size options
export type FontSizeLevel = 'small' | 'medium' | 'large';

export const FONT_SCALE: Record<FontSizeLevel, number> = {
  small:  0.88,
  medium: 1.0,
  large:  1.18,
};

type AppContextType = {
  fontSizeLevel: FontSizeLevel;
  fontScale: number;
  setFontSizeLevel: (level: FontSizeLevel) => Promise<void>;
};

const AppContext = createContext<AppContextType>({
  fontSizeLevel: 'medium',
  fontScale: 1.0,
  setFontSizeLevel: async () => {},
});

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [fontSizeLevel, setLevel] = useState<FontSizeLevel>('medium');

  useEffect(() => {
    AsyncStorage.getItem('appFontSize').then(saved => {
      if (saved === 'small' || saved === 'medium' || saved === 'large') {
        setLevel(saved as FontSizeLevel);
      }
    });
  }, []);

  const setFontSizeLevel = async (level: FontSizeLevel) => {
    setLevel(level);
    await AsyncStorage.setItem('appFontSize', level);
  };

  return (
    <AppContext.Provider value={{
      fontSizeLevel,
      fontScale: FONT_SCALE[fontSizeLevel],
      setFontSizeLevel,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export const useAppContext = () => useContext(AppContext);
