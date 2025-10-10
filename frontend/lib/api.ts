const apiBase = (process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000").replace(/\/$/, "");
const wsBase = (process.env.NEXT_PUBLIC_WS_BASE_URL || apiBase.replace(/^http/, "ws")).replace(/\/$/, "");

export function apiUrl(path: string): string {
  return `${apiBase}${path}`;
}

export function wsUrl(path: string): string {
  return `${wsBase}${path}`;
}
