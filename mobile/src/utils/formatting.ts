export const formatRemainingTime = (seconds: number | null): string => {
  if (seconds == null) {
    return 'Session will begin once a guest joins.';
  }
  if (seconds <= 0) {
    return 'Session timer elapsed.';
  }
  const rounded = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(rounded / 3600);
  const minutes = Math.floor((rounded % 3600) / 60);
  const secs = rounded % 60;
  if (hours > 0) {
    return `${hours}h ${minutes.toString().padStart(2, '0')}m remaining`;
  }
  return `${minutes}m ${secs.toString().padStart(2, '0')}s remaining`;
};

export const formatJoinedAt = (isoString: string): string => {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) {
    return 'Joined time unavailable';
  }
  return `Joined ${date.toLocaleString()}`;
};

export const mapStatusLabel = (status: string | undefined): string => {
  switch (status) {
    case 'active': return 'Active';
    case 'issued': return 'Waiting';
    case 'closed': return 'Closed';
    case 'expired': return 'Expired';
    case 'deleted': return 'Deleted';
    default: return 'Unknown';
  }
};

export const mapStatusDescription = (status: string | undefined): string => {
  switch (status) {
    case 'active':
      return 'Both participants are connected to the live session.';
    case 'issued':
      return 'Share the token with your guest to begin the session.';
    case 'closed':
      return 'This session has been closed.';
    case 'expired':
      return 'This session expired before both participants connected.';
    case 'deleted':
      return 'This session is no longer available.';
    default:
      return 'Session status is being determined.';
  }
};

export const statusVariant = (status: string | undefined): 'success' | 'waiting' | 'inactive' => {
  switch (status) {
    case 'active': return 'success';
    case 'issued': return 'waiting';
    default: return 'inactive';
  }
};
