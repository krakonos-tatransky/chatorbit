const PHONE_MAX_SHORT_DIMENSION = 480;
const TABLET_MAX_SHORT_DIMENSION = 900;
const MOBILE_TABLET_MAX_SHORT_DIMENSION = 1080;
const TABLET_MAX_LONG_DIMENSION = 1440;
const DESKTOP_MIN_WIDTH = 1025;
const DESKTOP_MIN_HEIGHT = 700;

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

export function getViewportType(target?: Window): ViewportType {
  const win = resolveWindow(target);
  if (!win) {
    return "desktop";
  }

  const viewportWidth = resolveDimension(win, "width");
  const viewportHeight = resolveDimension(win, "height");
  const shortestSide = Math.min(viewportWidth, viewportHeight);
  const longestSide = Math.max(viewportWidth, viewportHeight);

  const navigator = win.navigator as (Navigator & {
    userAgentData?: { mobile?: boolean };
  }) | null;
  const userAgent = navigator?.userAgent ?? "";
  const hasMobileHint = Boolean(navigator?.userAgentData?.mobile) || /Mobi|Android/i.test(userAgent);

  if (hasMobileHint) {
    if (shortestSide <= PHONE_MAX_SHORT_DIMENSION) {
      return "phone";
    }

    if (
      shortestSide <= MOBILE_TABLET_MAX_SHORT_DIMENSION ||
      longestSide <= TABLET_MAX_LONG_DIMENSION
    ) {
      return "tablet";
    }
  }

  if (viewportWidth >= DESKTOP_MIN_WIDTH && viewportHeight >= DESKTOP_MIN_HEIGHT) {
    return "desktop";
  }

  if (shortestSide <= PHONE_MAX_SHORT_DIMENSION) {
    return "phone";
  }

  if (
    shortestSide <= TABLET_MAX_SHORT_DIMENSION ||
    longestSide <= TABLET_MAX_LONG_DIMENSION
  ) {
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
  tabletMaxShortDimension: TABLET_MAX_SHORT_DIMENSION,
  mobileTabletMaxShortDimension: MOBILE_TABLET_MAX_SHORT_DIMENSION,
  tabletMaxLongDimension: TABLET_MAX_LONG_DIMENSION,
  desktopMinWidth: DESKTOP_MIN_WIDTH,
  desktopMinHeight: DESKTOP_MIN_HEIGHT,
} as const;
