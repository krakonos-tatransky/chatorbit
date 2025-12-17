import { DurationOption, TokenTierOption, ValidityOption } from '../types';

export const durationOptions: DurationOption[] = [
  { label: '15 minutes', value: '15m' },
  { label: '30 minutes', value: '30m' },
  { label: '1 hour', value: '1h' },
  { label: '4 hours', value: '4h' }
];

export const tokenTierOptions: TokenTierOption[] = [
  { label: 'Standard Session', value: 'standard' },
  { label: 'Premium Session', value: 'premium' }
];

export const validityOptions: ValidityOption[] = [
  { label: 'Valid for 1 day', value: '1_day' },
  { label: 'Valid for 1 week', value: '1_week' },
  { label: 'Valid for 1 month', value: '1_month' },
  { label: 'Valid for 1 year', value: '1_year' }
];

export const SESSION_TTL_MINUTES: Record<string, number> = {
  '15m': 15,
  '30m': 30,
  '1h': 60,
  '4h': 240
};

export const DEFAULT_MESSAGE_CHAR_LIMIT = 2000;
