const PHONE_MAX_SHORT_DIMENSION = 440;
const PHONE_MAX_LONG_DIMENSION = 960;
const TABLET_MAX_SHORT_DIMENSION = 900;
const TABLET_MAX_LONG_DIMENSION = 1440;
const DESKTOP_MIN_WIDTH = 1024;
const DESKTOP_MIN_HEIGHT = 720;

const PHONE_USER_AGENT = /\b(iPhone|iPod|Windows Phone|webOS|BlackBerry|Opera Mini)\b|Android.+Mobile/i;
const TABLET_USER_AGENT = /\b(iPad|Tablet)\b|Android(?!.*Mobile)/i;

export type ViewportType = "phone" | "tablet" | "desktop";

function resolveWindow(target?: Window): Window | undefined {
  if (target) {
    return target;
  }
  if (typeof window === "undefined") {
    return undefined;
  }
  return window;
}

function resolveDimension(win: Window, dimension: "width" | "height"): number {
  const visualViewport = win.visualViewport;
  if (visualViewport) {
    if (dimension === "width" && typeof visualViewport.width === "number") {
      return visualViewport.width;
    }
    if (dimension === "height" && typeof visualViewport.height === "number") {
      return visualViewport.height;
    }
  }

  if (dimension === "width") {
    if (typeof win.innerWidth === "number") {
      return win.innerWidth;
    }
    if (win.document?.documentElement?.clientWidth) {
      return win.document.documentElement.clientWidth;
    }
    if (win.document?.body?.clientWidth) {
      return win.document.body.clientWidth;
    }
    if (typeof win.screen?.width === "number") {
      return win.screen.width;
    }
  } else {
    if (typeof win.innerHeight === "number") {
      return win.innerHeight;
    }
    if (win.document?.documentElement?.clientHeight) {
      return win.document.documentElement.clientHeight;
    }
    if (win.document?.body?.clientHeight) {
      return win.document.body.clientHeight;
    }
    if (typeof win.screen?.height === "number") {
      return win.screen.height;
    }
  }

  return Number.POSITIVE_INFINITY;
}

type ExtendedNavigator = Navigator & {
  userAgentData?: { mobile?: boolean } | undefined;
  maxTouchPoints?: number | undefined;
};

function hasCoarsePointer(win: Window): boolean {
  if (typeof win.matchMedia !== "function") {
    return false;
  }
  try {
    return win.matchMedia("(pointer: coarse)").matches;
  } catch {
    return false;
  }
}

function getNavigator(win: Window): ExtendedNavigator | null {
  return (win.navigator as ExtendedNavigator | undefined) ?? null;
}

export function getViewportType(target?: Window): ViewportType {
  const win = resolveWindow(target);
  if (!win) {
    return "desktop";
  }

  const viewportWidth = resolveDimension(win, "width");
  const viewportHeight = resolveDimension(win, "height");
  const shortestSide = Math.min(viewportWidth, viewportHeight);
  const longestSide = Math.max(viewportWidth, viewportHeight);

  const navigator = getNavigator(win);
  const userAgent = navigator?.userAgent ?? "";
  const isPhoneUserAgent = PHONE_USER_AGENT.test(userAgent);
  const isTabletUserAgent = !isPhoneUserAgent && TABLET_USER_AGENT.test(userAgent);
  const hasTouchPoints = typeof navigator?.maxTouchPoints === "number" && navigator.maxTouchPoints > 0;
  const hasMobileUserAgentHint = Boolean(navigator?.userAgentData?.mobile) || isPhoneUserAgent || isTabletUserAgent;
  const coarsePointer = hasCoarsePointer(win);

  if (isPhoneUserAgent) {
    if (shortestSide <= PHONE_MAX_SHORT_DIMENSION || longestSide <= PHONE_MAX_LONG_DIMENSION) {
      return "phone";
    }
  }

  if (isTabletUserAgent) {
    if (shortestSide <= PHONE_MAX_SHORT_DIMENSION) {
      return "phone";
    }
    if (shortestSide <= TABLET_MAX_SHORT_DIMENSION || longestSide <= TABLET_MAX_LONG_DIMENSION) {
      return "tablet";
    }
  }

  if (viewportWidth >= DESKTOP_MIN_WIDTH && viewportHeight >= DESKTOP_MIN_HEIGHT && !coarsePointer) {
    return "desktop";
  }

  if (shortestSide <= PHONE_MAX_SHORT_DIMENSION) {
    return "phone";
  }

  if (shortestSide <= TABLET_MAX_SHORT_DIMENSION || longestSide <= TABLET_MAX_LONG_DIMENSION) {
    return "tablet";
  }

  if (coarsePointer || hasMobileUserAgentHint || hasTouchPoints) {
    return "tablet";
  }

  return "desktop";
}

export function isPhoneViewport(target?: Window): boolean {
  return getViewportType(target) === "phone";
}

export function isTabletViewport(target?: Window): boolean {
  return getViewportType(target) === "tablet";
}

export function isDesktopViewport(target?: Window): boolean {
  return getViewportType(target) === "desktop";
}

export const viewportBreakpoints = {
  phoneMaxShortDimension: PHONE_MAX_SHORT_DIMENSION,
  phoneMaxLongDimension: PHONE_MAX_LONG_DIMENSION,
  tabletMaxShortDimension: TABLET_MAX_SHORT_DIMENSION,
  tabletMaxLongDimension: TABLET_MAX_LONG_DIMENSION,
  desktopMinWidth: DESKTOP_MIN_WIDTH,
  desktopMinHeight: DESKTOP_MIN_HEIGHT,
} as const;
