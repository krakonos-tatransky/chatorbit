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
        ignorePopStateRef.current = true;
        window.history.forward();
      }
    };

    const handleDocumentClick = (event: MouseEvent) => {
      if (event.defaultPrevented) {
        return;
      }

      if (event.button !== 0) {
        return;
      }

      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }

      const target = event.target as Element | null;
      const anchor = target?.closest("a") as HTMLAnchorElement | null;
      if (!anchor) {
        return;
      }

      if (anchor.target === "_blank" || anchor.hasAttribute("download")) {
        return;
      }

      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#")) {
        return;
      }

      if (href.toLowerCase().startsWith("javascript:")) {
        return;
      }

      if (
        anchor.protocol === "mailto:" ||
        anchor.protocol === "tel:" ||
        anchor.dataset.navigationPromptIgnore !== undefined
      ) {
        return;
      }

      if (anchor.href === window.location.href) {
        return;
      }

      const shouldLeave = confirmNavigation();
      if (!shouldLeave) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("popstate", handlePopState);
    window.addEventListener("click", handleDocumentClick, true);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("click", handleDocumentClick, true);
    };
  }, [ignorePopStateRef, message]);

  return null;
}
