export const extractFriendlyError = (rawBody: string): string => {
  if (!rawBody) {
    return 'Unexpected response from the server.';
  }

  try {
    const parsed = JSON.parse(rawBody);
    if (typeof parsed?.detail === 'string') {
      return parsed.detail;
    }
    if (Array.isArray(parsed?.detail)) {
      const combined = parsed.detail
        .map((item: any) => (typeof item?.msg === 'string' ? item.msg : null))
        .filter(Boolean)
        .join('\n');
      if (combined) {
        return combined;
      }
    }
  } catch {
    // ignore
  }

  return rawBody;
};

export function upsertMessage<T extends { messageId: string; createdAt: string }>(
  list: T[],
  message: T,
): T[] {
  const next = list.filter((item) => item.messageId !== message.messageId);
  next.push(message);
  next.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  return next;
}
