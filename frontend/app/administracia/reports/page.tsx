"use client";

import { useEffect, useMemo, useState } from "react";

import { AdminLayout } from "@/components/admin/admin-layout";
import { AdminLoginPanel } from "@/components/admin/admin-login-panel";
import { AdminReportRow } from "@/components/admin/admin-report-row";
import { useAdminAuth } from "@/components/admin/use-admin-auth";
import { type AdminAbuseReport, type AdminAbuseReportListResponse } from "@/components/admin/types";
import { apiUrl } from "@/lib/api";

export default function AdminReportsPage() {
  const { token, ready, saveToken, clearToken } = useAdminAuth();
  const [statusFilter, setStatusFilter] = useState<
    "all" | "unresolved" | "open" | "acknowledged" | "investigating" | "closed"
  >("unresolved");
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
        if (statusFilter !== "all") {
          params.set("status_filter", statusFilter);
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

  const handleReportUpdated = (updatedReport: AdminAbuseReport) => {
    setReports((previous) =>
      previous.map((report) => (report.id === updatedReport.id ? updatedReport : report)),
    );
  };

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
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}
          >
            <option value="unresolved">Unresolved (open, acknowledged, investigating)</option>
            <option value="open">Open only</option>
            <option value="acknowledged">Acknowledged</option>
            <option value="investigating">Investigating</option>
            <option value="closed">Closed</option>
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
              <th scope="col">Participants</th>
              <th scope="col">Follow-up</th>
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
                <AdminReportRow
                  key={report.id}
                  report={report}
                  authToken={token}
                  onUpdated={handleReportUpdated}
                  onAuthError={clearToken}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  );
}
