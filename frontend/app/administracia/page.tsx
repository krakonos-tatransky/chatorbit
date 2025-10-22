"use client";

import { useEffect, useMemo, useState } from "react";

import { AdminLayout } from "@/components/admin/admin-layout";
import { AdminLoginPanel } from "@/components/admin/admin-login-panel";
import { useAdminAuth } from "@/components/admin/use-admin-auth";
import { apiUrl } from "@/lib/api";

type AdminSessionParticipant = {
  participant_id: string;
  role: string;
  ip_address: string;
  internal_ip_address: string | null;
  client_identity: string | null;
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

export default function AdminSessionsPage() {
  const { token, ready, saveToken, clearToken } = useAdminAuth();
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("active");
  const [tokenQuery, setTokenQuery] = useState("");
  const [ipQuery, setIpQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessions, setSessions] = useState<AdminSessionSummary[]>([]);

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

  const groupedSessions = useMemo(() => {
    const sorted = [...sessions].sort((a, b) => {
      const aDate = a.session_started_at ?? a.validity_expires_at;
      const bDate = b.session_started_at ?? b.validity_expires_at;
      return new Date(bDate).getTime() - new Date(aDate).getTime();
    });
    return sorted;
  }, [sessions]);

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
    </AdminLayout>
  );
}
