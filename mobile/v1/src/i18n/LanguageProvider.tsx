import React, { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';
import {
  DEFAULT_LANGUAGE,
  LANGUAGE_DEFINITIONS,
  SUPPORTED_LANGUAGES,
  getTranslations,
  type AppTranslation,
  type LanguageCode,
  type LanguageDefinition
} from './translations';

const STORAGE_KEY = 'chatOrbit.language';

type LanguageContextValue = {
  language: LanguageCode;
  setLanguage: (language: LanguageCode) => void;
  definition: LanguageDefinition;
  translations: AppTranslation;
  availableLanguages: LanguageDefinition[];
  isLoading: boolean;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

async function detectInitialLanguage(): Promise<LanguageCode> {
  try {
    // Try to load from AsyncStorage first
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (stored && (SUPPORTED_LANGUAGES as string[]).includes(stored)) {
      return stored as LanguageCode;
    }

    // Fall back to device locale
    const deviceLocale = Localization.locale?.slice(0, 2).toLowerCase();
    if (deviceLocale && (SUPPORTED_LANGUAGES as string[]).includes(deviceLocale)) {
      return deviceLocale as LanguageCode;
    }
  } catch (error) {
    console.warn('Failed to detect initial language:', error);
  }

  return DEFAULT_LANGUAGE;
}

type LanguageProviderProps = {
  children: ReactNode;
};

export function LanguageProvider({ children }: LanguageProviderProps) {
  const [language, setLanguageState] = useState<LanguageCode>(DEFAULT_LANGUAGE);
  const [isLoading, setIsLoading] = useState(true);

  // Load initial language on mount
  useEffect(() => {
    let mounted = true;

    detectInitialLanguage().then((initialLanguage) => {
      if (mounted) {
        setLanguageState(initialLanguage);
        setIsLoading(false);
      }
    });

    return () => {
      mounted = false;
    };
  }, []);

  // Persist language changes to AsyncStorage
  useEffect(() => {
    if (isLoading) {
      return;
    }

    AsyncStorage.setItem(STORAGE_KEY, language).catch((error) => {
      console.warn('Failed to save language preference:', error);
    });
  }, [language, isLoading]);

  const setLanguage = useCallback((nextLanguage: LanguageCode) => {
    setLanguageState(nextLanguage);
  }, []);

  const contextValue = useMemo<LanguageContextValue>(() => {
    const definition = LANGUAGE_DEFINITIONS[language] ?? LANGUAGE_DEFINITIONS[DEFAULT_LANGUAGE];
    const translations = getTranslations(language);
    const availableLanguages = SUPPORTED_LANGUAGES.map((code) => LANGUAGE_DEFINITIONS[code]);

    return {
      language,
      setLanguage,
      definition,
      translations,
      availableLanguages,
      isLoading
    };
  }, [language, setLanguage, isLoading]);

  return <LanguageContext.Provider value={contextValue}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
