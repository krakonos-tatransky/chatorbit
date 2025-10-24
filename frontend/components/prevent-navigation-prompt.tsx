"use client";

import { useEffect } from "react";

export interface PreventNavigationPromptProps {
  message?: string;
}

const DEFAULT_MESSAGE = "Are you sure you want to leave this page?";

export function PreventNavigationPrompt({
  message = DEFAULT_MESSAGE,
}: PreventNavigationPromptProps) {
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = message;
      return message;
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [message]);

  return null;
}
