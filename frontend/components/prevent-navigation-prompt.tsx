"use client";

import { useEffect, useRef } from "react";

import { useLanguage } from "@/components/language/language-provider";

export interface PreventNavigationPromptProps {
  message?: string;
}

export function PreventNavigationPrompt({
  message,
}: PreventNavigationPromptProps) {
  const {
    translations: { preventNavigation },
  } = useLanguage();
  const ignorePopStateRef = useRef(false);
  const resolvedMessage = message ?? preventNavigation.message;

  useEffect(() => {
    const confirmNavigation = () => window.confirm(resolvedMessage);

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = resolvedMessage;
      return resolvedMessage;
    };

    const handlePopState = () => {
      if (ignorePopStateRef.current) {
        ignorePopStateRef.current = false;
        return;
      }

      const shouldLeave = confirmNavigation();
      if (!shouldLeave) {
        ignorePopStateRef.current = true;
        window.history.forward();
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("popstate", handlePopState);
    };
  }, [ignorePopStateRef, resolvedMessage]);

  return null;
}
