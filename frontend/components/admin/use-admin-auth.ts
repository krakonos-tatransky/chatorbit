"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "chatorbit:adminToken";

export function useAdminAuth() {
  const [token, setToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setToken(stored);
      }
    } catch (cause) {
      console.warn("Unable to read stored admin token", cause);
    } finally {
      setReady(true);
    }
  }, []);

  const saveToken = useCallback((value: string) => {
    setToken(value);
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(STORAGE_KEY, value);
      } catch (cause) {
        console.warn("Unable to persist admin token", cause);
      }
    }
  }, []);

  const clearToken = useCallback(() => {
    setToken(null);
    if (typeof window !== "undefined") {
      try {
        window.localStorage.removeItem(STORAGE_KEY);
      } catch (cause) {
        console.warn("Unable to clear stored admin token", cause);
      }
    }
  }, []);

  return { token, ready, saveToken, clearToken };
}
