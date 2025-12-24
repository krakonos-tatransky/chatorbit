/**
 * Date Utilities
 *
 * Helper functions for parsing and formatting dates.
 * Handles UTC timezone parsing for backend API responses.
 */

/**
 * Parse a datetime string from the backend as UTC.
 *
 * The backend returns datetime strings without timezone info (e.g., "2024-12-22T10:00:00").
 * JavaScript's Date constructor interprets strings without timezone as LOCAL time,
 * but the backend always returns UTC times. This function ensures correct UTC parsing.
 *
 * @param dateString - ISO 8601 datetime string from backend (may or may not have Z suffix)
 * @returns Date object representing the correct UTC time, or null if invalid
 */
export function parseUTCDate(dateString: string | null | undefined): Date | null {
  if (!dateString) {
    return null;
  }

  // If the string already has timezone info (Z or +/-offset), parse directly
  if (dateString.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(dateString)) {
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? null : date;
  }

  // Otherwise, append 'Z' to indicate UTC
  const utcString = dateString + 'Z';
  const date = new Date(utcString);
  return isNaN(date.getTime()) ? null : date;
}

/**
 * Format seconds as MM:SS or HH:MM:SS if over an hour
 */
export function formatDuration(totalSeconds: number): string {
  if (totalSeconds <= 0) {
    return '00:00';
  }

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}
