import { getIceServers } from "./webrtc";

type CandidateType = "relay" | "srflx" | "prflx" | "host" | string;

type CandidateDetails = {
  identity: string;
  type: CandidateType;
};

const STORAGE_KEY = "chatOrbit.clientIdentity";
const CANDIDATE_PRIORITY: Record<CandidateType, number> = {
  relay: 0,
  srflx: 1,
  prflx: 2,
  host: 3,
};

let cachedIdentityPromise: Promise<string | null> | null = null;

function parseCandidate(candidate: RTCIceCandidate): CandidateDetails | null {
  const candidateString = candidate.candidate?.trim();
  if (!candidateString) {
    return null;
  }

  const normalized = candidateString.startsWith("candidate:")
    ? candidateString.slice("candidate:".length)
    : candidateString;
  const parts = normalized.split(/\s+/);

  if (parts.length < 8) {
    return null;
  }

  const ip = candidate.address ?? parts[4];
  const portString = `${candidate.port ?? parts[5]}`.trim();
  const port = Number.parseInt(portString, 10);
  const typeIndex = parts.indexOf("typ");
  const type = (candidate.type ?? (typeIndex >= 0 ? parts[typeIndex + 1] : undefined)) as CandidateType | undefined;

  if (!ip || Number.isNaN(port) || !type) {
    return null;
  }

  return { identity: `${type}:${ip}:${port}`, type };
}

async function gatherIdentity(): Promise<string | null> {
  if (typeof window === "undefined" || typeof window.RTCPeerConnection === "undefined") {
    return null;
  }

  const stored = (() => {
    try {
      return window.localStorage?.getItem(STORAGE_KEY) ?? null;
    } catch (error) {
      console.warn("Unable to read cached client identity", error);
      return null;
    }
  })();

  if (stored) {
    return stored;
  }

  const iceServers = getIceServers();
  const configuration = iceServers.length > 0 ? { iceServers } : undefined;

  const pc = new RTCPeerConnection(configuration);
  let channel: RTCDataChannel | null = null;
  try {
    channel = pc.createDataChannel("identity-probe", { negotiated: false });
  } catch (error) {
    console.debug("Unable to create identity probe data channel", error);
  }

  let timeout: number | null = null;
  let resolved = false;
  let best: { identity: string; rank: number } | null = null;
  let resolvePromise: (identity: string | null) => void = () => undefined;

  function finish(identity: string | null) {
    if (resolved) {
      return;
    }
    resolved = true;
    if (timeout !== null) {
      window.clearTimeout(timeout);
      timeout = null;
    }
    if (channel) {
      try {
        channel.close();
      } catch (error) {
        console.debug("Failed to close probe data channel", error);
      }
    }
    try {
      pc.close();
    } catch (error) {
      console.debug("Failed to close RTCPeerConnection", error);
    }

    if (identity) {
      try {
        window.localStorage?.setItem(STORAGE_KEY, identity);
      } catch (error) {
        console.warn("Unable to persist client identity", error);
      }
    }

    resolvePromise(identity);
  }

  function consider(candidate: RTCIceCandidate) {
    const details = parseCandidate(candidate);
    if (!details) {
      return;
    }
    const rank = CANDIDATE_PRIORITY[details.type] ?? 99;
    if (!best || rank < best.rank) {
      best = { identity: details.identity, rank };
      if (rank <= CANDIDATE_PRIORITY.srflx) {
        finish(details.identity);
      }
    }
  }

  const identityPromise = new Promise<string | null>((resolve) => {
    resolvePromise = resolve;
    timeout = window.setTimeout(() => {
      finish(best?.identity ?? null);
    }, 4000);

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        consider(event.candidate);
      } else {
        finish(best?.identity ?? null);
      }
    };

    pc.onicecandidateerror = () => {
      finish(best?.identity ?? null);
    };

    pc
      .createOffer({ iceRestart: true })
      .then((offer) => pc.setLocalDescription(offer))
      .catch((error) => {
        console.warn("Unable to generate ICE identity", error);
        finish(null);
      })
      .finally(() => {
        if (!resolved && pc.iceGatheringState === "complete") {
          finish(best?.identity ?? null);
        }
      });
  });

  return identityPromise;
}

export function getClientIdentity(): Promise<string | null> {
  if (!cachedIdentityPromise) {
    cachedIdentityPromise = gatherIdentity()
      .catch((error) => {
        console.warn("Falling back to IP-based identity due to ICE failure", error);
        return null;
      })
      .then((identity) => {
        if (!identity) {
          cachedIdentityPromise = null;
        }
        return identity;
      });
  }
  return cachedIdentityPromise;
}

