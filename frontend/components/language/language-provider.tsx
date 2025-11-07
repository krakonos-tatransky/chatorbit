"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import {
  DEFAULT_LANGUAGE,
  LANGUAGE_DEFINITIONS,
  SUPPORTED_LANGUAGES,
  getTranslations,
  type AppTranslation,
  type LanguageCode,
  type LanguageDefinition,
} from "@/lib/i18n/translations";

const STORAGE_KEY = "chatOrbit.language";

type LanguageContextValue = {
  language: LanguageCode;
  setLanguage: (language: LanguageCode) => void;
  definition: LanguageDefinition;
  translations: AppTranslation;
  availableLanguages: LanguageDefinition[];
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

function detectInitialLanguage(): LanguageCode {
  if (typeof window === "undefined") {
    return DEFAULT_LANGUAGE;
  }

  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored && (SUPPORTED_LANGUAGES as string[]).includes(stored)) {
    return stored as LanguageCode;
  }

  const browserLang = window.navigator.language?.slice(0, 2).toLowerCase();
  if (browserLang && (SUPPORTED_LANGUAGES as string[]).includes(browserLang)) {
    return browserLang as LanguageCode;
  }

  return DEFAULT_LANGUAGE;
}

type LanguageProviderProps = {
  children: ReactNode;
};

export function LanguageProvider({ children }: LanguageProviderProps) {
  const [language, setLanguageState] = useState<LanguageCode>(DEFAULT_LANGUAGE);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (hydrated) {
      return;
    }
    const initialLanguage = detectInitialLanguage();
    setLanguageState(initialLanguage);
    setHydrated(true);
  }, [hydrated]);

  useEffect(() => {
    if (!hydrated) {
      return;
    }
    if (typeof document !== "undefined") {
      document.documentElement.lang = language;
    }
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, language);
    }
  }, [hydrated, language]);

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
    };
  }, [language, setLanguage]);

  return <LanguageContext.Provider value={contextValue}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
