"use client";

import { useEffect, useMemo, useState } from "react";

import { AdminLayout } from "@/components/admin/admin-layout";
import { AdminLoginPanel } from "@/components/admin/admin-login-panel";
import { useAdminAuth } from "@/components/admin/use-admin-auth";
import { apiUrl } from "@/lib/api";

type AdminAbuseReport = {
  id: number;
  status: string;
  created_at: string;
  session_token: string;
  reporter_email: string;
  summary: string;
  questionnaire?: Record<string, unknown> | null;
};

type AdminAbuseReportListResponse = {
  reports: AdminAbuseReport[];
};

export default function AdminReportsPage() {
  const { token, ready, saveToken, clearToken } = useAdminAuth();
  const [statusFilter, setStatusFilter] = useState<"all" | "open">("open");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reports, setReports] = useState<AdminAbuseReport[]>([]);

  useEffect(() => {
    if (!token) {
      setReports([]);
      return;
    }
    const controller = new AbortController();
    const fetchReports = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (statusFilter === "open") {
          params.set("status_filter", "open");
        }
        const query = params.toString();
        const response = await fetch(apiUrl(`/api/admin/reports${query ? `?${query}` : ""}`), {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });
        if (response.status === 401) {
          clearToken();
          throw new Error("Session expired. Please sign in again.");
        }
        if (!response.ok) {
          throw new Error("Unable to load abuse reports.");
        }
        const payload = (await response.json()) as AdminAbuseReportListResponse;
        setReports(payload.reports ?? []);
      } catch (cause) {
        if (controller.signal.aborted) {
          return;
        }
        setError(cause instanceof Error ? cause.message : "Unable to load abuse reports.");
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    void fetchReports();
    return () => controller.abort();
  }, [token, statusFilter, clearToken]);

  const sortedReports = useMemo(() => {
    return [...reports].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [reports]);

  if (!ready) {
    return <div className="admin-loading">Loading administration tools…</div>;
  }

  if (!token) {
    return <AdminLoginPanel onAuthenticated={saveToken} />;
  }

  return (
    <AdminLayout active="reports" onLogout={clearToken}>
      <div className="admin-controls">
        <label className="admin-controls__field">
          Report status
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}>
            <option value="open">Open reports</option>
            <option value="all">All reports</option>
          </select>
        </label>
      </div>

      {error ? <p className="admin-error">{error}</p> : null}

      <div className="admin-table-wrapper">
        <table className="admin-table">
          <thead>
            <tr>
              <th scope="col">Report</th>
              <th scope="col">Session</th>
              <th scope="col">Questionnaire</th>
            </tr>
          </thead>
          <tbody>
            {sortedReports.length === 0 ? (
              <tr>
                <td colSpan={3} className="admin-table__empty">
                  {loading ? "Loading reports…" : "No abuse reports to display."}
                </td>
              </tr>
            ) : (
              sortedReports.map((report) => (
                <tr key={report.id}>
                  <td>
                    <div className={`admin-status admin-status--${report.status}`}>#{report.id} · {report.status}</div>
                    <div className="admin-meta">Received {new Date(report.created_at).toLocaleString()}</div>
                    <div className="admin-meta">Reporter: {report.reporter_email}</div>
                    <p className="admin-summary">{report.summary}</p>
                  </td>
                  <td>
                    <code className="admin-code">{report.session_token}</code>
                  </td>
                  <td>
                    {report.questionnaire && Object.keys(report.questionnaire).length > 0 ? (
                      <ul className="admin-meta-list">
                        {Object.entries(report.questionnaire).map(([key, value]) => (
                          <li key={key}>
                            <span className="admin-meta-key">{key.replace(/_/g, " ")}:</span>{" "}
                            <span className="admin-meta-value">{formatQuestionnaireValue(value)}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <span className="admin-meta">No questionnaire data</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  );
}

function formatQuestionnaireValue(value: unknown): string {
  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }
  if (value === null || value === undefined) {
    return "—";
  }
  if (typeof value === "string" && value.trim().length === 0) {
    return "—";
  }
  return String(value);
}
