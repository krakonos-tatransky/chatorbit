import { useEffect, useMemo, useState } from "react";

export type DeviceInfo = {
  isIOS: boolean;
  isAndroid: boolean;
};

const BROWSER_CHECK_INTERVAL_MS = 5000;

const isClient = typeof window !== "undefined";

const getMatches = (query: string): boolean => {
  if (!isClient || typeof window.matchMedia !== "function") {
    return false;
  }
  return window.matchMedia(query).matches;
};

const addMediaListener = (
  mediaQuery: string,
  callback: (matches: boolean) => void,
): (() => void) | null => {
  if (!isClient || typeof window.matchMedia !== "function") {
    return null;
  }

  const mql = window.matchMedia(mediaQuery);

  const handler = (event: MediaQueryListEvent) => {
    callback(event.matches);
  };

  if (typeof mql.addEventListener === "function") {
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }

  if (typeof mql.addListener === "function") {
    mql.addListener(handler);
    return () => mql.removeListener(handler);
  }

  return null;
};

export const getDeviceInfo = (): DeviceInfo => {
  if (typeof navigator === "undefined") {
    return { isIOS: false, isAndroid: false };
  }

  const ua = navigator.userAgent.toLowerCase();
  const platform = (navigator as { platform?: string }).platform || "";
  const maxTouchPoints = (navigator as { maxTouchPoints?: number }).maxTouchPoints ?? 0;

  const isIOS =
    /iphone|ipad|ipod/.test(ua) ||
    (platform === "MacIntel" && typeof maxTouchPoints === "number" && maxTouchPoints > 1);
  const isAndroid = /android/.test(ua);

  return { isIOS, isAndroid };
};

export type DeviceProfile = DeviceInfo & {
  isMobile: boolean;
  isLandscape: boolean;
  isSmallScreen: boolean;
};

export const useDeviceProfile = (): DeviceProfile => {
  const [device, setDevice] = useState<DeviceInfo>(() => getDeviceInfo());
  const [isLandscape, setIsLandscape] = useState<boolean>(() => getMatches("(orientation: landscape)"));
  const [isSmallScreen, setIsSmallScreen] = useState<boolean>(() => getMatches("(max-width: 640px)"));

  useEffect(() => {
    const cleanup = addMediaListener("(orientation: landscape)", setIsLandscape);
    return cleanup ?? undefined;
  }, []);

  useEffect(() => {
    const cleanup = addMediaListener("(max-width: 640px)", setIsSmallScreen);
    return cleanup ?? undefined;
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const recalc = () => setDevice(getDeviceInfo());
    const timer = window.setInterval(recalc, BROWSER_CHECK_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (typeof navigator === "undefined" || typeof document === "undefined") {
      return;
    }

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        setDevice(getDeviceInfo());
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  return useMemo(
    () => ({
      ...device,
      isMobile: device.isIOS || device.isAndroid,
      isLandscape,
      isSmallScreen,
    }),
    [device, isLandscape, isSmallScreen],
  );
};
