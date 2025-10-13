const UNROUTABLE_HOSTS = new Set(["0.0.0.0", "127.0.0.1", "localhost", "[::]", "::", "::1"]);

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
  return true;
}

function sanitizeIceUrls(urls: string[]): string[] {
  const valid = urls.filter(isRoutableIceServerUrl);
  if (valid.length === 0 && urls.length > 0 && typeof console !== "undefined") {
    console.warn("Ignoring configured ICE server URLs because they are unroutable", urls);
  }
  if (valid.length !== urls.length && typeof console !== "undefined") {
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
  return sanitizeIceUrls(parseCsv(process.env.NEXT_PUBLIC_WEBRTC_DEFAULT_STUN_URLS));
}

function getDefaultTurnConfiguration(): RTCIceServer | null {
  const urls = sanitizeIceUrls(parseCsv(process.env.NEXT_PUBLIC_WEBRTC_DEFAULT_TURN_URLS));
  if (urls.length === 0) {
    return null;
  }

  const username = process.env.NEXT_PUBLIC_WEBRTC_DEFAULT_TURN_USERNAME;
  const credential = process.env.NEXT_PUBLIC_WEBRTC_DEFAULT_TURN_CREDENTIAL;

  if (username && credential) {
    return { urls, username, credential };
  }

  if (typeof console !== "undefined") {
    console.warn(
      "Ignoring default TURN URLs because NEXT_PUBLIC_WEBRTC_DEFAULT_TURN_USERNAME or NEXT_PUBLIC_WEBRTC_DEFAULT_TURN_CREDENTIAL is missing.",
    );
  }

  return null;
}

function parseConfiguredIceServers(): RTCIceServer[] | null {
  const raw = process.env.NEXT_PUBLIC_WEBRTC_ICE_SERVERS;
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw);
    const items = Array.isArray(parsed) ? parsed : [parsed];
    const servers: RTCIceServer[] = [];

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
      const urls = item.urls;
      const urlList = Array.isArray(urls)
        ? urls.map((url) => `${url}`.trim()).filter((url) => url.length > 0)
        : typeof urls === "string"
          ? [`${urls}`.trim()].filter((url) => url.length > 0)
          : [];
      const sanitizedUrls = sanitizeIceUrls(urlList);
      if (sanitizedUrls.length === 0) {
        continue;
      }
      servers.push({
        urls: sanitizedUrls,
        username: typeof item.username === "string" ? item.username : undefined,
        credential: typeof item.credential === "string" ? item.credential : undefined,
        credentialType:
          item.credentialType === "oauth" || item.credentialType === "password"
            ? item.credentialType
            : undefined,
      });
    }

    if (servers.length > 0) {
      return servers;
    }
  } catch (error) {
    console.warn("Unable to parse NEXT_PUBLIC_WEBRTC_ICE_SERVERS", error);
  }
  return null;
}

export function getIceServers(): RTCIceServer[] {
  const configured = parseConfiguredIceServers();
  if (configured) {
    return configured;
  }

  const iceServers: RTCIceServer[] = [];

  const stunUrls = sanitizeIceUrls(parseCsv(process.env.NEXT_PUBLIC_WEBRTC_STUN_URLS));
  const defaultStunUrls = getDefaultStunUrls();
  const effectiveStunUrls = stunUrls.length > 0 ? stunUrls : defaultStunUrls;
  if (effectiveStunUrls.length > 0) {
    iceServers.push({ urls: effectiveStunUrls });
  } else if (typeof console !== "undefined") {
    console.warn("No STUN URLs configured; peer connectivity may be impaired.");
  }

  const turnUrls = sanitizeIceUrls(parseCsv(process.env.NEXT_PUBLIC_WEBRTC_TURN_URLS));
  const turnUsername = process.env.NEXT_PUBLIC_WEBRTC_TURN_USERNAME ?? process.env.NEXT_PUBLIC_WEBRTC_TURN_USER;
  const turnCredential =
    process.env.NEXT_PUBLIC_WEBRTC_TURN_CREDENTIAL ?? process.env.NEXT_PUBLIC_WEBRTC_TURN_PASSWORD;

  if (turnUrls.length > 0) {
    if (turnUsername && turnCredential) {
      iceServers.push({ urls: turnUrls, username: turnUsername, credential: turnCredential });
    } else if (typeof console !== "undefined") {
      console.warn(
        "Ignoring configured TURN URLs because NEXT_PUBLIC_WEBRTC_TURN_USERNAME or NEXT_PUBLIC_WEBRTC_TURN_CREDENTIAL is missing.",
      );
    }
  } else {
    const defaultTurn = getDefaultTurnConfiguration();
    if (defaultTurn) {
      iceServers.push(defaultTurn);
    }
  }

  return iceServers;
}
