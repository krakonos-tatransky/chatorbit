"use client";

import { useEffect, useRef } from "react";

export interface PreventNavigationPromptProps {
  message?: string;
}

const DEFAULT_MESSAGE = "Are you sure you want to leave this page?";

export function PreventNavigationPrompt({
  message = DEFAULT_MESSAGE,
}: PreventNavigationPromptProps) {
  const ignorePopStateRef = useRef(false);

  useEffect(() => {
    const confirmNavigation = () => window.confirm(message);

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = message;
      return message;
    };

    const handlePopState = () => {
      if (ignorePopStateRef.current) {
        ignorePopStateRef.current = false;
        return;
      }

      const shouldLeave = confirmNavigation();
      if (!shouldLeave) {
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("navigation:cancelled"));
        }
        ignorePopStateRef.current = true;
        window.history.forward();
        return;
      }

      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("navigation:confirmed"));
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("popstate", handlePopState);
    };
  }, [ignorePopStateRef, message]);

  return null;
}
