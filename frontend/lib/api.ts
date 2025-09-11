export const API = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

export async function api<T>(
  path: string,
  opts: RequestInit & { csrf?: string } = {}
): Promise<T> {
  const headers = new Headers(opts.headers || {});
  headers.set("Content-Type", "application/json");
  if (opts.csrf) headers.set("X-CSRF-Token", opts.csrf);
  const res = await fetch(`${API}${path}`, {
    ...opts,
    headers,
    credentials: "include",    // cookie session
  });
  if (!res.ok) {
    const msg = await res.text().catch(() => "");
    throw new Error(`${res.status} ${msg || res.statusText}`);
  }
  // no body on 204 etc.
  const ct = res.headers.get("content-type") || "";
  return ct.includes("application/json") ? (await res.json() as T) : (undefined as T);
}
