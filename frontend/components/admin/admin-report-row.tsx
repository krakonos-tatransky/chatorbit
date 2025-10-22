"use client";

import { useEffect, useState } from "react";

import { apiUrl } from "@/lib/api";

import type { AdminAbuseReport, AdminReportStatus } from "./types";
import { ADMIN_REPORT_STATUS_OPTIONS } from "./types";

type AdminReportRowProps = {
  report: AdminAbuseReport;
  authToken: string;
  onUpdated: (report: AdminAbuseReport) => void;
  onAuthError: () => void;
};

type RemoteParticipant = AdminAbuseReport["remote_participants"][number];

export function AdminReportRow({ report, authToken, onUpdated, onAuthError }: AdminReportRowProps) {
  const [status, setStatus] = useState<AdminReportStatus>(report.status);
  const [escalationStep, setEscalationStep] = useState(report.escalation_step ?? "");
  const [adminNotes, setAdminNotes] = useState(report.admin_notes ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setStatus(report.status);
    setEscalationStep(report.escalation_step ?? "");
    setAdminNotes(report.admin_notes ?? "");
    setMessage(null);
    setError(null);
  }, [report]);

  useEffect(() => {
    if (!message) {
      return;
    }
    const timeout = window.setTimeout(() => setMessage(null), 4000);
    return () => window.clearTimeout(timeout);
  }, [message]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch(apiUrl(`/api/admin/reports/${report.id}`), {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          status,
          escalation_step: escalationStep,
          admin_notes: adminNotes,
        }),
      });
      if (response.status === 401) {
        onAuthError();
        throw new Error("Session expired. Please sign in again.");
      }
      if (!response.ok) {
        throw new Error("Unable to update abuse report.");
      }
      const payload = (await response.json()) as AdminAbuseReport;
      onUpdated(payload);
      setMessage("Follow-up saved successfully.");
      setStatus(payload.status);
      setEscalationStep(payload.escalation_step ?? "");
      setAdminNotes(payload.admin_notes ?? "");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to update abuse report.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <tr>
      <td>
        <div className={`admin-status admin-status--${report.status}`}>#{report.id} · {report.status}</div>
        <div className="admin-meta">Received {new Date(report.created_at).toLocaleString()}</div>
        <div className="admin-meta">Updated {new Date(report.updated_at).toLocaleString()}</div>
        <div className="admin-meta">Reporter: {report.reporter_email}</div>
        {report.reporter_ip ? <div className="admin-meta">Reporter IP: {report.reporter_ip}</div> : null}
        {report.participant_id ? (
          <div className="admin-meta">Reporter participant ID: {report.participant_id}</div>
        ) : null}
        <p className="admin-summary">{report.summary}</p>
        <div className="admin-questionnaire">
          <h3>Questionnaire</h3>
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
        </div>
      </td>
      <td>
        <div className="admin-participants">
          <code className="admin-code">Session: {report.session_token}</code>
          {report.remote_participants.length === 0 ? (
            <p className="admin-meta">No remote participants recorded.</p>
          ) : (
            report.remote_participants.map((participant) => (
              <ParticipantCard key={`${participant.participant_id}-${participant.ip_address ?? "unknown"}`} participant={participant} />
            ))
          )}
        </div>
      </td>
      <td>
        <form className="admin-followup-form" onSubmit={handleSubmit}>
          <label className="admin-form__field">
            Status
            <select value={status} onChange={(event) => setStatus(event.target.value as AdminReportStatus)}>
              {ADMIN_REPORT_STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="admin-form__field">
            Next escalation step
            <input
              type="text"
              value={escalationStep}
              onChange={(event) => setEscalationStep(event.target.value)}
              placeholder="E.g. contact legal, notify customer"
            />
          </label>
          <label className="admin-form__field">
            Internal notes
            <textarea
              value={adminNotes}
              onChange={(event) => setAdminNotes(event.target.value)}
              rows={4}
              placeholder="Document ongoing actions, investigator assignments, or evidence."
            />
          </label>
          {error ? <p className="admin-form__error">{error}</p> : null}
          {message ? <p className="admin-form__success">{message}</p> : null}
          <div className="admin-followup-actions">
            <button type="submit" className="admin-button" disabled={saving}>
              {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
        </form>
      </td>
    </tr>
  );
}

function ParticipantCard({ participant }: { participant: RemoteParticipant }) {
  return (
    <article className="admin-participant">
      <header>
        <div className="admin-meta">Participant ID: {participant.participant_id ?? "—"}</div>
        {participant.role ? <div className="admin-meta">Role: {participant.role}</div> : null}
      </header>
      <div className="admin-meta">IP address: {participant.ip_address ?? "—"}</div>
      {participant.client_identity ? (
        <div className="admin-meta">Client identity: {participant.client_identity}</div>
      ) : null}
      {participant.joined_at ? (
        <div className="admin-meta">Joined at: {new Date(participant.joined_at).toLocaleString()}</div>
      ) : null}
    </article>
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
