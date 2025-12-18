export const SESSION_CONFIG = {
  DEFAULT_MESSAGE_CHAR_LIMIT: 2000,

  SESSION_TTL_MINUTES: {
    '15m': 15,
    '30m': 30,
    '1h': 60,
    '4h': 240,
  } as const,

  DURATION_OPTIONS: [
    { label: '15 minutes', value: '15m' },
    { label: '30 minutes', value: '30m' },
    { label: '1 hour', value: '1h' },
    { label: '4 hours', value: '4h' },
  ] as const,

  TOKEN_TIER_OPTIONS: [
    { label: 'Standard Session', value: 'standard' },
    { label: 'Premium Session', value: 'premium' },
  ] as const,

  VALIDITY_OPTIONS: [
    { label: 'Valid for 1 day', value: '1_day' },
    { label: 'Valid for 1 week', value: '1_week' },
    { label: 'Valid for 1 month', value: '1_month' },
    { label: 'Valid for 1 year', value: '1_year' },
  ] as const,
} as const;
