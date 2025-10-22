import { SessionView } from "@/components/session-view";

type Props = {
  params: { token: string };
  searchParams: { [key: string]: string | string[] | undefined };
};

export default function SessionPage({ params, searchParams }: Props) {
  const participantId = typeof searchParams.participant === "string" ? searchParams.participant : undefined;
  const reportAbuseRequested =
    typeof searchParams.reportAbuse === "string" &&
    ["1", "true", "yes"].includes(searchParams.reportAbuse.toLowerCase());
  return (
    <SessionView
      token={params.token}
      participantIdFromQuery={participantId}
      initialReportAbuseOpen={reportAbuseRequested}
    />
  );
}
