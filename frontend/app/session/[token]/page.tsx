import { SessionView } from "@/components/session-view";

type Props = {
  params: { token: string };
  searchParams: { [key: string]: string | string[] | undefined };
};

export default function SessionPage({ params, searchParams }: Props) {
  const participantId = typeof searchParams.participant === "string" ? searchParams.participant : undefined;
  return <SessionView token={params.token} participantIdFromQuery={participantId} />;
}
