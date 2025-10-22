let resolvedApiBase: string | null = null;
let resolvedWsBase: string | null = null;

function getApiBase(): string {
  if (resolvedApiBase) {
    return resolvedApiBase;
  }

  const apiBaseEnv = process.env.NEXT_PUBLIC_API_BASE_URL;

  if (!apiBaseEnv) {
    throw new Error("NEXT_PUBLIC_API_BASE_URL is not defined");
  }

  resolvedApiBase = apiBaseEnv.replace(/\/$/, "");
  return resolvedApiBase;
}

function getWsBase(): string {
  if (resolvedWsBase) {
    return resolvedWsBase;
  }

  const wsBaseEnv = process.env.NEXT_PUBLIC_WS_BASE_URL;
  const base = wsBaseEnv && wsBaseEnv.trim().length > 0 ? wsBaseEnv : getApiBase().replace(/^http/, "ws");

  resolvedWsBase = base.replace(/\/$/, "");
  return resolvedWsBase;
}

export function apiUrl(path: string): string {
  return `${getApiBase()}${path}`;
}

export function wsUrl(path: string): string {
  return `${getWsBase()}${path}`;
}
