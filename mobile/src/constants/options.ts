import { SESSION_CONFIG } from './session';
import type { DurationOption, TokenTierOption, ValidityOption } from '../types';

export const durationOptions: DurationOption[] = [...SESSION_CONFIG.DURATION_OPTIONS];

export const tokenTierOptions: TokenTierOption[] = [...SESSION_CONFIG.TOKEN_TIER_OPTIONS];

export const validityOptions: ValidityOption[] = [...SESSION_CONFIG.VALIDITY_OPTIONS];

export const SESSION_TTL_MINUTES: Record<string, number> = { ...SESSION_CONFIG.SESSION_TTL_MINUTES };

export const DEFAULT_MESSAGE_CHAR_LIMIT = SESSION_CONFIG.DEFAULT_MESSAGE_CHAR_LIMIT;
