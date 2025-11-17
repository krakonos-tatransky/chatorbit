"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { AdminLayout } from "@/components/admin/admin-layout";
import { AdminLoginPanel } from "@/components/admin/admin-login-panel";
import { useAdminAuth } from "@/components/admin/use-admin-auth";
import { apiUrl } from "@/lib/api";

type ParticipantHeaders = Record<string, unknown>;

type AdminSessionParticipant = {
  participant_id: string;
  role: string;
  ip_address: string;
  internal_ip_address: string | null;
  client_identity: string | null;
  request_headers: ParticipantHeaders | null;
  joined_at: string;
};

type AdminSessionSummary = {
  token: string;
  status: string;
  validity_expires_at: string;
  session_started_at: string | null;
  session_expires_at: string | null;
  message_char_limit: number;
  participants: AdminSessionParticipant[];
};

type AdminSessionListResponse = {
  sessions: AdminSessionSummary[];
};

type AdminRateLimitLock = {
  identifier_type: "client_identity" | "ip_address";
  identifier: string;
  request_count: number;
  window_seconds: number;
  last_request_at: string;
};

type AdminRateLimitListResponse = {
  locks: AdminRateLimitLock[];
};

type AdminResetRateLimitResponse = {
  removed_entries: number;
};

type HeadersDialogState = {
  participantId: string;
  role: string;
  headers: ParticipantHeaders;
};

export default function AdminSessionsPage() {
  const { token, ready, saveToken, clearToken } = useAdminAuth();
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("active");
  const [tokenQuery, setTokenQuery] = useState("");
  const [ipQuery, setIpQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessions, setSessions] = useState<AdminSessionSummary[]>([]);
  const [rateLimitLocks, setRateLimitLocks] = useState<AdminRateLimitLock[]>([]);
  const [locksLoading, setLocksLoading] = useState(false);
  const [locksError, setLocksError] = useState<string | null>(null);
  const [resettingIdentifier, setResettingIdentifier] = useState<string | null>(null);
  const [resetMessage, setResetMessage] = useState<string | null>(null);
  const [headersDialog, setHeadersDialog] = useState<HeadersDialogState | null>(null);

  const fetchRateLimitLocks = useCallback(
    async (signal?: AbortSignal) => {
      if (!token) {
        setRateLimitLocks([]);
        return;
      }
      setLocksLoading(true);
      setLocksError(null);
      try {
        const response = await fetch(apiUrl("/api/admin/rate-limits"), {
          headers: { Authorization: `Bearer ${token}` },
          signal,
        });
        if (response.status === 401) {
          clearToken();
          throw new Error("Session expired. Please sign in again.");
        }
        if (!response.ok) {
          throw new Error("Unable to load rate limit locks. Please try again.");
        }
        const payload = (await response.json()) as AdminRateLimitListResponse;
        setRateLimitLocks(payload.locks ?? []);
      } catch (cause) {
        if (signal?.aborted) {
          return;
        }
        setLocksError(
          cause instanceof Error ? cause.message : "Unable to load rate limit locks.",
        );
      } finally {
        if (!signal?.aborted) {
          setLocksLoading(false);
        }
      }
    },
    [clearToken, token],
  );

  useEffect(() => {
    if (!token) {
      setSessions([]);
      return;
    }
    const controller = new AbortController();
    const fetchSessions = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (statusFilter !== "all") {
          params.set("status_filter", statusFilter);
        }
        if (tokenQuery.trim()) {
          params.set("token_query", tokenQuery.trim());
        }
        if (ipQuery.trim()) {
          params.set("ip", ipQuery.trim());
        }
        const query = params.toString();
        const response = await fetch(apiUrl(`/api/admin/sessions${query ? `?${query}` : ""}`), {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });
        if (response.status === 401) {
          clearToken();
          throw new Error("Session expired. Please sign in again.");
        }
        if (!response.ok) {
          throw new Error("Unable to load sessions. Please try again.");
        }
        const payload = (await response.json()) as AdminSessionListResponse;
        setSessions(payload.sessions ?? []);
      } catch (cause) {
        if (controller.signal.aborted) {
          return;
        }
        setError(cause instanceof Error ? cause.message : "Unable to load sessions.");
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    void fetchSessions();
    return () => controller.abort();
  }, [token, statusFilter, tokenQuery, ipQuery, clearToken]);

  useEffect(() => {
    if (!token) {
      setRateLimitLocks([]);
      return;
    }
    const controller = new AbortController();
    void fetchRateLimitLocks(controller.signal);
    return () => controller.abort();
  }, [token, fetchRateLimitLocks]);

  useEffect(() => {
    if (!headersDialog) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setHeadersDialog(null);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [headersDialog]);

  const handleResetRateLimit = async (lock: AdminRateLimitLock) => {
    if (!token) {
      return;
    }
    setResettingIdentifier(lock.identifier);
    setResetMessage(null);
    setLocksError(null);
    try {
      const response = await fetch(apiUrl("/api/admin/rate-limits/reset"), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          identifier_type: lock.identifier_type,
          identifier: lock.identifier,
        }),
      });
      if (response.status === 401) {
        clearToken();
        throw new Error("Session expired. Please sign in again.");
      }
      if (!response.ok) {
        throw new Error("Unable to reset the rate limit for this identifier.");
      }
      const payload = (await response.json()) as AdminResetRateLimitResponse;
      setResetMessage(
        `Removed ${payload.removed_entries} request log(s) for ${lock.identifier}.`,
      );
      await fetchRateLimitLocks();
    } catch (cause) {
      setLocksError(
        cause instanceof Error
          ? cause.message
          : "Unable to reset the rate limit. Please try again.",
      );
    } finally {
      setResettingIdentifier(null);
    }
  };

  const groupedSessions = useMemo(() => {
    const sorted = [...sessions].sort((a, b) => {
      const aDate = a.session_started_at ?? a.validity_expires_at;
      const bDate = b.session_started_at ?? b.validity_expires_at;
      return new Date(bDate).getTime() - new Date(aDate).getTime();
    });
    return sorted;
  }, [sessions]);

  const closeHeadersDialog = () => setHeadersDialog(null);

  if (!ready) {
    return <div className="admin-loading">Loading administration tools…</div>;
  }

  if (!token) {
    return <AdminLoginPanel onAuthenticated={saveToken} />;
  }

  return (
    <AdminLayout active="sessions" onLogout={clearToken}>
      <div className="admin-controls">
        <label className="admin-controls__field">
          Session status
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}>
            <option value="all">All sessions</option>
            <option value="active">Active only</option>
            <option value="inactive">Closed or expired</option>
          </select>
        </label>
        <label className="admin-controls__field">
          Session token
          <input
            type="text"
            value={tokenQuery}
            onChange={(event) => setTokenQuery(event.target.value)}
            placeholder="Search by token"
          />
        </label>
        <label className="admin-controls__field">
          IP address
          <input
            type="text"
            value={ipQuery}
            onChange={(event) => setIpQuery(event.target.value)}
            placeholder="Search by IP"
          />
        </label>
      </div>

      {error ? <p className="admin-error">{error}</p> : null}

      <div className="admin-table-wrapper">
        <table className="admin-table">
          <thead>
            <tr>
              <th scope="col">Token</th>
              <th scope="col">Status</th>
              <th scope="col">Session window</th>
              <th scope="col">Participants</th>
            </tr>
          </thead>
          <tbody>
            {groupedSessions.length === 0 ? (
              <tr>
                <td colSpan={4} className="admin-table__empty">
                  {loading ? "Loading sessions…" : "No sessions match the selected filters."}
                </td>
              </tr>
            ) : (
              groupedSessions.map((session) => {
                const started = session.session_started_at ? new Date(session.session_started_at) : null;
                const expires = session.session_expires_at ? new Date(session.session_expires_at) : null;
                return (
                  <tr key={session.token}>
                    <td>
                      <code className="admin-code">{session.token}</code>
                      <div className="admin-meta">TTL: {session.message_char_limit.toLocaleString()} chars/message</div>
                    </td>
                    <td className={`admin-status admin-status--${session.status}`}>{session.status}</td>
                    <td>
                      <div className="admin-meta">Valid until {new Date(session.validity_expires_at).toLocaleString()}</div>
                      {started ? (
                        <div className="admin-meta">
                          Started {started.toLocaleString()} → {expires ? expires.toLocaleString() : "—"}
                        </div>
                      ) : (
                        <div className="admin-meta">Guest pending join</div>
                      )}
                    </td>
                    <td>
                      <ul className="admin-participant-list">
                        {session.participants.map((participant) => (
                          <li key={participant.participant_id}>
                            <span className="admin-participant-role">{participant.role}</span>
                            <span className="admin-meta">ID: {participant.participant_id}</span>
                            <span className="admin-meta">IP: {participant.ip_address}</span>
                            {participant.internal_ip_address ? (
                              <span className="admin-meta">Internal IP: {participant.internal_ip_address}</span>
                            ) : null}
                            {participant.client_identity ? (
                              <span className="admin-meta">Client: {participant.client_identity}</span>
                            ) : null}
                            <span className="admin-meta">Joined: {new Date(participant.joined_at).toLocaleString()}</span>
                            {participant.request_headers ? (
                              <button
                                type="button"
                                className="admin-action-button"
                                onClick={() =>
                                  setHeadersDialog({
                                    participantId: participant.participant_id,
                                    role: participant.role,
                                    headers: participant.request_headers ?? {},
                                  })
                                }
                              >
                                Headers
                              </button>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="admin-card admin-card--section">
        <div className="admin-card__header">
          <div>
            <h2 className="admin-card__title">Current rate limit locks</h2>
            <p className="admin-card__description">
              Requests counted within the most recent hour. Resetting a lock removes recent
              request logs so additional tokens can be issued immediately.
            </p>
          </div>
          <div className="admin-card__actions">
            <button
              type="button"
              className="admin-button admin-button--ghost"
              onClick={() => fetchRateLimitLocks()}
              disabled={locksLoading}
            >
              {locksLoading ? "Refreshing…" : "Refresh"}
            </button>
          </div>
        </div>

        {locksError ? <p className="admin-error">{locksError}</p> : null}
        {resetMessage ? <p className="admin-form__success">{resetMessage}</p> : null}

        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th scope="col">Identifier</th>
                <th scope="col">Type</th>
                <th scope="col">Requests (1h)</th>
                <th scope="col">Last request</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rateLimitLocks.length === 0 ? (
                <tr>
                  <td colSpan={5} className="admin-table__empty">
                    {locksLoading
                      ? "Loading rate limit locks…"
                      : "No rate limit locks detected in the current window."}
                  </td>
                </tr>
              ) : (
                rateLimitLocks.map((lock) => (
                  <tr key={`${lock.identifier_type}:${lock.identifier}`}>
                    <td>
                      <code className="admin-code">{lock.identifier}</code>
                    </td>
                    <td className="admin-meta">
                      {lock.identifier_type === "client_identity" ? "Client identity" : "IP address"}
                    </td>
                    <td>{lock.request_count}</td>
                    <td className="admin-meta">
                      {new Date(lock.last_request_at).toLocaleString()}
                    </td>
                    <td>
                      <button
                        type="button"
                        className="admin-button admin-button--ghost"
                        onClick={() => handleResetRateLimit(lock)}
                        disabled={resettingIdentifier === lock.identifier}
                      >
                        {resettingIdentifier === lock.identifier ? "Resetting…" : "Reset lock"}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {headersDialog ? (
        <div
          className="admin-dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby="admin-headers-title"
        >
          <div className="admin-dialog__backdrop" onClick={closeHeadersDialog} />
          <div className="admin-dialog__panel" role="document">
            <div className="admin-dialog__header">
              <h2 id="admin-headers-title" className="admin-dialog__title">
                Request headers for {headersDialog.role} ({headersDialog.participantId})
              </h2>
              <button type="button" className="admin-dialog__close" onClick={closeHeadersDialog}>
                Close
              </button>
            </div>
            <pre className="admin-dialog__content">
              {JSON.stringify(headersDialog.headers ?? {}, null, 2)}
            </pre>
          </div>
        </div>
      ) : null}
    </AdminLayout>
  );
}
