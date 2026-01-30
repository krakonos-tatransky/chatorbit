/**
 * Language Provider
 *
 * Provides language context throughout the app with AsyncStorage persistence.
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  type LanguageCode,
  type AppTranslation,
  DEFAULT_LANGUAGE,
  getTranslations,
  LANGUAGE_DEFINITIONS,
} from './translations';

const STORAGE_KEY = '@chatorbit_language';

interface LanguageContextValue {
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
  t: AppTranslation;
  isLoading: boolean;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

interface LanguageProviderProps {
  children: ReactNode;
}

export const LanguageProvider: React.FC<LanguageProviderProps> = ({
  children,
}) => {
  const [language, setLanguageState] = useState<LanguageCode>(DEFAULT_LANGUAGE);
  const [isLoading, setIsLoading] = useState(true);

  // Load saved language on mount
  useEffect(() => {
    const loadLanguage = async () => {
      try {
        const savedLanguage = await AsyncStorage.getItem(STORAGE_KEY);
        if (
          savedLanguage &&
          LANGUAGE_DEFINITIONS[savedLanguage as LanguageCode]
        ) {
          setLanguageState(savedLanguage as LanguageCode);
        }
      } catch (error) {
        console.error('[i18n] Failed to load language:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadLanguage();
  }, []);

  // Set language and persist to storage
  const setLanguage = useCallback(async (lang: LanguageCode) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, lang);
      setLanguageState(lang);
      console.log('[i18n] Language set to:', lang);
    } catch (error) {
      console.error('[i18n] Failed to save language:', error);
    }
  }, []);

  // Get translations for current language
  const t = useMemo(() => getTranslations(language), [language]);

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      t,
      isLoading,
    }),
    [language, setLanguage, t, isLoading]
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

/**
 * Hook to access language context
 */
export const useLanguage = (): LanguageContextValue => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

/**
 * Hook to access translations only
 */
export const useTranslation = (): AppTranslation => {
  const { t } = useLanguage();
  return t;
};
