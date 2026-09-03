import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'appLanguage';

export type AppLanguage = 'en' | 'fil' | 'ja' | 'es' | 'ko';

export const LANGUAGE_META: Record<AppLanguage, { name: string; nativeName: string; flag: string }> = {
  en:  { name: 'English',  nativeName: 'English',  flag: '🇺🇸' },
  fil: { name: 'Filipino', nativeName: 'Filipino', flag: '🇵🇭' },
  ja:  { name: 'Japanese', nativeName: '日本語',   flag: '🇯🇵' },
  es:  { name: 'Spanish',  nativeName: 'Español',  flag: '🇪🇸' },
  ko:  { name: 'Korean',   nativeName: '한국어',   flag: '🇰🇷' },
};

type LanguageContextType = {
  language: AppLanguage;
  setLanguage: (lang: AppLanguage) => Promise<void>;
};

const LanguageContext = createContext<LanguageContextType>({
  language: 'en',
  setLanguage: async () => {},
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLang] = useState<AppLanguage>('en');

  // Load persisted preference on mount
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(saved => {
      if (saved && saved in LANGUAGE_META) {
        setLang(saved as AppLanguage);
      }
    });
  }, []);

  const setLanguage = async (lang: AppLanguage) => {
    setLang(lang);
    await AsyncStorage.setItem(STORAGE_KEY, lang);
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => useContext(LanguageContext);
