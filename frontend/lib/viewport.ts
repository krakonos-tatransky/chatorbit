const PHONE_MAX_WIDTH = 768;
const PHONE_LANDSCAPE_MAX_HEIGHT = 600;
const TABLET_MAX_WIDTH = 1024;

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

function matchesMedia(win: Window, query: string): boolean {
  if (typeof win.matchMedia !== "function") {
    return false;
  }

  try {
    return win.matchMedia(query).matches;
  } catch {
    return false;
  }
}

function resolveDimension(win: Window, dimension: "width" | "height"): number {
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

  const matchesPhoneWidth = matchesMedia(win, `(max-width: ${PHONE_MAX_WIDTH}px)`);
  const matchesPhoneLandscapeHeight = matchesMedia(
    win,
    `(max-height: ${PHONE_LANDSCAPE_MAX_HEIGHT}px)`
  );
  const matchesTabletWidth = matchesMedia(win, `(max-width: ${TABLET_MAX_WIDTH}px)`);

  const viewportWidth = resolveDimension(win, "width");
  const viewportHeight = resolveDimension(win, "height");

  const isPhone =
    matchesPhoneWidth ||
    matchesPhoneLandscapeHeight ||
    viewportWidth <= PHONE_MAX_WIDTH ||
    viewportHeight <= PHONE_LANDSCAPE_MAX_HEIGHT;

  if (isPhone) {
    return "phone";
  }

  const isTablet = matchesTabletWidth || viewportWidth <= TABLET_MAX_WIDTH;
  if (isTablet) {
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
  phoneMaxWidth: PHONE_MAX_WIDTH,
  phoneLandscapeMaxHeight: PHONE_LANDSCAPE_MAX_HEIGHT,
  tabletMaxWidth: TABLET_MAX_WIDTH,
} as const;
