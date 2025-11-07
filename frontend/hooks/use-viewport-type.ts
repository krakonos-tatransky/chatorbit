"use client";

import { useEffect, useRef, useState } from "react";

import { getViewportType } from "@/lib/viewport";
import type { ViewportType } from "@/lib/viewport";

const VIEWPORT_EVENTS: Array<[targetGetter: (win: Window) => EventTarget | null, type: string]> = [
  [(win) => win, "resize"],
  [(win) => win, "orientationchange"],
  [(win) => win.visualViewport ?? null, "resize"],
  [(win) => win.visualViewport ?? null, "scroll"],
];

function resolveWindow(target?: Window): Window | undefined {
  if (target) {
    return target;
  }
  if (typeof window === "undefined") {
    return undefined;
  }
  return window;
}

export function useViewportType(target?: Window): ViewportType {
  const [viewportType, setViewportType] = useState<ViewportType>(() => getViewportType(target));
  const rafIdRef = useRef<number | null>(null);

  useEffect(() => {
    const win = resolveWindow(target);
    if (!win) {
      return undefined;
    }

    const update = () => {
      const nextType = getViewportType(win);
      setViewportType((current) => (current === nextType ? current : nextType));
    };

    const scheduleUpdate = () => {
      if (rafIdRef.current !== null) {
        win.cancelAnimationFrame(rafIdRef.current);
      }
      rafIdRef.current = win.requestAnimationFrame(() => {
        rafIdRef.current = null;
        update();
      });
    };

    scheduleUpdate();

    const coarsePointerQuery = typeof win.matchMedia === "function" ? win.matchMedia("(pointer: coarse)") : null;
    const pointerListener = () => scheduleUpdate();

    const bindings: Array<{ target: EventTarget; type: string; listener: () => void }> = [];

    for (const [targetGetter, eventType] of VIEWPORT_EVENTS) {
      const eventTarget = targetGetter(win);
      if (!eventTarget || typeof eventTarget.addEventListener !== "function") {
        continue;
      }
      const listener = scheduleUpdate;
      eventTarget.addEventListener(eventType, listener);
      bindings.push({ target: eventTarget, type: eventType, listener });
    }

    if (coarsePointerQuery) {
      if (typeof coarsePointerQuery.addEventListener === "function") {
        coarsePointerQuery.addEventListener("change", pointerListener);
        bindings.push({ target: coarsePointerQuery, type: "change", listener: pointerListener });
      } else if (typeof coarsePointerQuery.addListener === "function") {
        coarsePointerQuery.addListener(pointerListener);
        bindings.push({ target: coarsePointerQuery, type: "change", listener: pointerListener });
      }
    }

    return () => {
      for (const { target: eventTarget, type, listener } of bindings) {
        if (typeof (eventTarget as any).removeEventListener === "function") {
          (eventTarget as any).removeEventListener(type, listener);
        } else if (typeof (eventTarget as any).removeListener === "function") {
          (eventTarget as any).removeListener(listener);
        }
      }

      if (rafIdRef.current !== null) {
        win.cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, [target]);

  return viewportType;
}
