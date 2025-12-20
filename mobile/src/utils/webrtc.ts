const UNROUTABLE_HOSTS = new Set([
  "0.0.0.0",
  "127.0.0.1",
  "localhost",
  "[::]",
  "::",
  "::1",
  "[::1]",
]);

/**
 * Check if an IPv6 address is link-local (fe80::/10) or ULA (fc00::/7).
 * These addresses are not routable on the public internet.
 */
function isUnroutableIPv6(hostname: string): boolean {
  // Remove brackets if present
  const addr = hostname.startsWith("[") && hostname.endsWith("]")
    ? hostname.slice(1, -1).toLowerCase()
    : hostname.toLowerCase();

  // Skip if not IPv6
  if (!addr.includes(":")) {
    return false;
  }

  // Link-local: fe80::/10 (fe80:: to febf::)
  if (addr.startsWith("fe8") || addr.startsWith("fe9") ||
      addr.startsWith("fea") || addr.startsWith("feb")) {
    return true;
  }

  // Unique Local Address (ULA): fc00::/7 (fc00:: to fdff::)
  if (addr.startsWith("fc") || addr.startsWith("fd")) {
    return true;
  }

  return false;
}

export type IceServer = {
  urls: string | string[];
  username?: string;
  credential?: string;
  credentialType?: "password" | "oauth";
};

function getEnv(): Record<string, string> | null {
  if (typeof process === "undefined" || !process?.env) {
    return null;
  }
  return process.env as Record<string, string>;
}

function readEnvValue(...keys: string[]): string | undefined {
  const env = getEnv();
  if (!env) {
    return undefined;
  }
  for (const key of keys) {
    const value = env[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }
  return undefined;
}

function readPublicEnv(key: string): string | undefined {
  return readEnvValue(`EXPO_PUBLIC_${key}`, `NEXT_PUBLIC_${key}`, key);
}

function extractHostname(url: string): string | null {
  const withoutScheme = url.replace(/^([a-z][a-z0-9+.-]*):/i, "");
  if (!withoutScheme) {
    return null;
  }
  const withoutQuery = withoutScheme.split("?")[0] ?? "";
  const withoutPrefix = withoutQuery.replace(/^\/\//, "");
  const atIndex = withoutPrefix.lastIndexOf("@");
  const hostPort = atIndex >= 0 ? withoutPrefix.slice(atIndex + 1) : withoutPrefix;
  if (!hostPort) {
    return null;
  }
  if (hostPort.startsWith("[")) {
    const closingIndex = hostPort.indexOf("]");
    if (closingIndex === -1) {
      return null;
    }
    return hostPort.slice(0, closingIndex + 1);
  }
  const host = hostPort.split(":")[0];
  return host.length > 0 ? host : null;
}

function isRoutableIceServerUrl(url: string): boolean {
  const hostname = extractHostname(url);
  if (!hostname) {
    return false;
  }
  const normalized = hostname.toLowerCase();
  if (UNROUTABLE_HOSTS.has(normalized)) {
    return false;
  }
  if (isUnroutableIPv6(hostname)) {
    return false;
  }
  return true;
}

function sanitizeIceUrls(urls: string[]): string[] {
  const valid = urls.filter(isRoutableIceServerUrl);
  if (valid.length === 0 && urls.length > 0) {
    console.warn("Ignoring configured ICE server URLs because they are unroutable", urls);
  } else if (valid.length !== urls.length) {
    const ignored = urls.filter((url) => !isRoutableIceServerUrl(url));
    if (ignored.length > 0) {
      console.warn("Ignoring unroutable ICE server URLs", ignored);
    }
  }
  return valid;
}

function parseCsv(value?: string): string[] {
  if (!value) {
    return [];
  }
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

function getDefaultStunUrls(): string[] {
  return sanitizeIceUrls(parseCsv(readPublicEnv("WEBRTC_DEFAULT_STUN_URLS")));
}

function getDefaultTurnConfiguration(): IceServer | null {
  const urls = sanitizeIceUrls(parseCsv(readPublicEnv("WEBRTC_DEFAULT_TURN_URLS")));
  if (urls.length === 0) {
    return null;
  }
  const username = readPublicEnv("WEBRTC_TURN_DEFAULT_USER");
  const credential = readPublicEnv("WEBRTC_TURN_DEFAULT_PASSWORD");
  if (username && credential) {
    return { urls, username, credential };
  }
  console.warn(
    "Ignoring default TURN URLs because WEBRTC_TURN_DEFAULT_USER or WEBRTC_TURN_DEFAULT_PASSWORD is missing.",
  );
  return null;
}

function parseConfiguredIceServers(): IceServer[] | null {
  const raw = readPublicEnv("WEBRTC_ICE_SERVERS");
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw);
    const items = Array.isArray(parsed) ? parsed : [parsed];
    const servers: IceServer[] = [];
    for (const item of items) {
      if (typeof item === "string") {
        const trimmed = item.trim();
        if (trimmed.length > 0) {
          const sanitized = sanitizeIceUrls([trimmed]);
          if (sanitized.length > 0) {
            servers.push({ urls: sanitized });
          }
        }
        continue;
      }
      if (!item || typeof item !== "object") {
        continue;
      }
      const urlsField = item.urls;
      const urlList = Array.isArray(urlsField)
        ? urlsField.map((entry) => `${entry}`.trim()).filter((entry) => entry.length > 0)
        : typeof urlsField === "string"
          ? [`${urlsField}`.trim()].filter((entry) => entry.length > 0)
          : [];
      const sanitizedUrls = sanitizeIceUrls(urlList);
      if (sanitizedUrls.length === 0) {
        continue;
      }
      const credentialType =
        item.credentialType === "oauth" || item.credentialType === "password"
          ? item.credentialType
          : undefined;
      const server: IceServer = {
        urls: sanitizedUrls,
        username: typeof item.username === "string" ? item.username : undefined,
        credential: typeof item.credential === "string" ? item.credential : undefined,
      };
      if (credentialType) {
        server.credentialType = credentialType;
      }
      servers.push(server);
    }
    return servers.length > 0 ? servers : null;
  } catch (error) {
    console.warn("Unable to parse WEBRTC_ICE_SERVERS", error);
    return null;
  }
}

export function getIceServers(): IceServer[] {
  const configured = parseConfiguredIceServers();
  if (configured) {
    return configured;
  }
  const iceServers: IceServer[] = [];
  const stunUrls = sanitizeIceUrls(parseCsv(readPublicEnv("WEBRTC_STUN_URLS")));
  const defaultStunUrls = getDefaultStunUrls();
  const effectiveStunUrls = stunUrls.length > 0 ? stunUrls : defaultStunUrls;
  if (effectiveStunUrls.length > 0) {
    iceServers.push({ urls: effectiveStunUrls });
  } else {
    console.warn("No STUN URLs configured; peer connectivity may be impaired.");
  }
  const turnUrls = sanitizeIceUrls(parseCsv(readPublicEnv("WEBRTC_TURN_URLS")));
  const turnUsername = readPublicEnv("WEBRTC_TURN_USER");
  const turnCredential = readPublicEnv("WEBRTC_TURN_PASSWORD");
  if (turnUrls.length > 0) {
    if (turnUsername && turnCredential) {
      iceServers.push({ urls: turnUrls, username: turnUsername, credential: turnCredential });
    } else {
      console.warn(
        "Ignoring configured TURN URLs because WEBRTC_TURN_USER or WEBRTC_TURN_PASSWORD is missing.",
      );
    }
  } else {
    const fallbackTurn = getDefaultTurnConfiguration();
    if (fallbackTurn) {
      iceServers.push(fallbackTurn);
    }
  }
  return iceServers;
}

export function hasRelayIceServers(servers: IceServer[]): boolean {
  return servers.some((server) => {
    const urls = Array.isArray(server.urls) ? server.urls : [server.urls];
    return urls.some((url) => (typeof url === "string" ? url.trim().toLowerCase().startsWith("turn") : false));
  });
}
