const DEFAULT_STUN_URLS = ["stun:stun.l.google.com:19302"];
const DEFAULT_TURN_URLS = [
  "turn:openrelay.metered.ca:80",
  "turn:openrelay.metered.ca:443",
  "turn:openrelay.metered.ca:443?transport=tcp",
];
const DEFAULT_TURN_USERNAME = "openrelayproject";
const DEFAULT_TURN_CREDENTIAL = "openrelayproject";

function parseCsv(value?: string): string[] {
  if (!value) {
    return [];
  }
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
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
        if (item.trim().length > 0) {
          servers.push({ urls: [item.trim()] });
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
      if (urlList.length === 0) {
        continue;
      }
      servers.push({
        urls: urlList,
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

  const stunUrls = parseCsv(process.env.NEXT_PUBLIC_WEBRTC_STUN_URLS);
  const effectiveStunUrls = stunUrls.length > 0 ? stunUrls : DEFAULT_STUN_URLS;
  iceServers.push({ urls: effectiveStunUrls });

  const turnUrls = parseCsv(process.env.NEXT_PUBLIC_WEBRTC_TURN_URLS);
  const turnUsername = process.env.NEXT_PUBLIC_WEBRTC_TURN_USERNAME ?? process.env.NEXT_PUBLIC_WEBRTC_TURN_USER;
  const turnCredential =
    process.env.NEXT_PUBLIC_WEBRTC_TURN_CREDENTIAL ?? process.env.NEXT_PUBLIC_WEBRTC_TURN_PASSWORD;

  if (turnUrls.length > 0 && turnUsername && turnCredential) {
    iceServers.push({ urls: turnUrls, username: turnUsername, credential: turnCredential });
  } else {
    iceServers.push({
      urls: DEFAULT_TURN_URLS,
      username: DEFAULT_TURN_USERNAME,
      credential: DEFAULT_TURN_CREDENTIAL,
    });
  }

  return iceServers;
}
