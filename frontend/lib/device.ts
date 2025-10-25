export type ViewportOrientation = "portrait" | "landscape";

export type ViewportInfo = {
  isMobile: boolean;
  orientation: ViewportOrientation;
};

const MOBILE_MAX_WIDTH_QUERY = "(max-width: 900px)";
const COARSE_POINTER_QUERY = "(pointer: coarse)";

const MOBILE_USER_AGENT_PATTERN = /Mobi|Android|iPhone|iPad|iPod|Windows Phone/i;

function getMatches(query: string): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }
  return window.matchMedia(query).matches;
}

export function isMobileViewport(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  const userAgent = typeof navigator !== "undefined" ? navigator.userAgent : "";
  if (MOBILE_USER_AGENT_PATTERN.test(userAgent)) {
    return true;
  }

  return getMatches(MOBILE_MAX_WIDTH_QUERY) || getMatches(COARSE_POINTER_QUERY);
}

export function getViewportOrientation(): ViewportOrientation {
  if (typeof window === "undefined") {
    return "portrait";
  }

  if (getMatches("(orientation: landscape)")) {
    return "landscape";
  }

  if (getMatches("(orientation: portrait)")) {
    return "portrait";
  }

  return window.innerWidth >= window.innerHeight ? "landscape" : "portrait";
}

export function getViewportInfo(): ViewportInfo {
  return {
    isMobile: isMobileViewport(),
    orientation: getViewportOrientation(),
  };
}

function addMediaListener(mediaQueryList: MediaQueryList, listener: () => void) {
  if (typeof mediaQueryList.addEventListener === "function") {
    mediaQueryList.addEventListener("change", listener);
  } else if (typeof mediaQueryList.addListener === "function") {
    mediaQueryList.addListener(listener);
  }
}

function removeMediaListener(mediaQueryList: MediaQueryList, listener: () => void) {
  if (typeof mediaQueryList.removeEventListener === "function") {
    mediaQueryList.removeEventListener("change", listener);
  } else if (typeof mediaQueryList.removeListener === "function") {
    mediaQueryList.removeListener(listener);
  }
}

export function subscribeToViewportInfo(listener: (info: ViewportInfo) => void): () => void {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const handleChange = () => {
    listener(getViewportInfo());
  };

  const monitoredQueries = [
    window.matchMedia(MOBILE_MAX_WIDTH_QUERY),
    window.matchMedia(COARSE_POINTER_QUERY),
    window.matchMedia("(orientation: portrait)"),
    window.matchMedia("(orientation: landscape)"),
  ];

  for (const query of monitoredQueries) {
    addMediaListener(query, handleChange);
  }

  window.addEventListener("resize", handleChange);
  window.addEventListener("orientationchange", handleChange);

  return () => {
    for (const query of monitoredQueries) {
      removeMediaListener(query, handleChange);
    }
    window.removeEventListener("resize", handleChange);
    window.removeEventListener("orientationchange", handleChange);
  };
}
