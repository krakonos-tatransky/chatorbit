export type AdminReportStatus = "open" | "acknowledged" | "investigating" | "closed";

export type AdminReportParticipant = {
  participant_id: string | null;
  role: string | null;
  ip_address: string | null;
  client_identity: string | null;
  joined_at: string | null;
};

export type AdminAbuseReport = {
  id: number;
  status: AdminReportStatus;
  created_at: string;
  updated_at: string;
  session_token: string;
  reporter_email: string;
  reporter_ip: string | null;
  participant_id: string | null;
  summary: string;
  questionnaire?: Record<string, unknown> | null;
  escalation_step: string | null;
  admin_notes: string | null;
  remote_participants: AdminReportParticipant[];
};

export type AdminAbuseReportListResponse = {
  reports: AdminAbuseReport[];
};

export const ADMIN_REPORT_STATUS_OPTIONS: Array<{ value: AdminReportStatus; label: string }> = [
  { value: "open", label: "Open" },
  { value: "acknowledged", label: "Acknowledged" },
  { value: "investigating", label: "Investigating" },
  { value: "closed", label: "Closed" },
];
