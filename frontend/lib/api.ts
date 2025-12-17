/* eslint-disable no-console */

let resolvedApiBase: string | null | undefined;
let resolvedWsBase: string | null | undefined;
let warnedAboutApiFallback = false;
let warnedAboutWsFallback = false;

function getApiBase(): string | null {
  if (resolvedApiBase !== undefined) {
    return resolvedApiBase;
  }

  const apiBaseEnv = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();

  if (!apiBaseEnv) {
    resolvedApiBase = null;
    return resolvedApiBase;
  }

  resolvedApiBase = apiBaseEnv.replace(/\/$/, "");
  return resolvedApiBase;
}

function getWsBase(): string | null {
  if (resolvedWsBase !== undefined) {
    return resolvedWsBase;
  }

  const wsBaseEnv = process.env.NEXT_PUBLIC_WS_BASE_URL?.trim();
  if (wsBaseEnv) {
    resolvedWsBase = wsBaseEnv.replace(/\/$/, "");
    return resolvedWsBase;
  }

  const apiBase = getApiBase();
  if (apiBase) {
    resolvedWsBase = apiBase.replace(/^http/, "ws");
    return resolvedWsBase;
  }

  resolvedWsBase = null;
  return resolvedWsBase;
}

export function apiUrl(path: string): string {
  const base = getApiBase();
  if (base) {
    return `${base}${path}`;
  }

  if (!warnedAboutApiFallback && typeof console !== "undefined") {
    console.warn(
      "NEXT_PUBLIC_API_BASE_URL is not defined; falling back to relative API paths.",
    );
    warnedAboutApiFallback = true;
  }

  return path;
}

export function wsUrl(path: string): string {
  const base = getWsBase();
  if (base) {
    return `${base}${path}`;
  }

  if (typeof window !== "undefined") {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    return `${protocol}//${window.location.host}${path}`;
  }

  if (!warnedAboutWsFallback && typeof console !== "undefined") {
    console.warn(
      "NEXT_PUBLIC_WS_BASE_URL is not defined; using relative WebSocket paths.",
    );
    warnedAboutWsFallback = true;
  }

  return path;
}
