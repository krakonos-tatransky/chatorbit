/**
 * HTTP Client
 *
 * Axios-based HTTP client with interceptors, error handling, and base configuration.
 */

import axios, { type AxiosInstance, type AxiosError, type AxiosRequestConfig } from 'axios';
import { API_CONFIG } from '../../utils/env';
import type { APIError } from './types';

/**
 * Create and configure the Axios instance
 */
function createAPIClient(): AxiosInstance {
  console.log('[API] Creating client with baseURL:', API_CONFIG.baseUrl);
  const client = axios.create({
    baseURL: API_CONFIG.baseUrl,
    timeout: 30000, // 30 seconds
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // Request interceptor
  client.interceptors.request.use(
    (config) => {
      // Log requests in development
      if (__DEV__) {
        const fullUrl = `${config.baseURL || ''}${config.url}`;
        console.log(`[API] ${config.method?.toUpperCase()} ${fullUrl}`);
      }
      return config;
    },
    (error) => {
      console.error('[API] Request error:', error);
      return Promise.reject(error);
    }
  );

  // Response interceptor
  client.interceptors.response.use(
    (response) => {
      // Log responses in development
      if (__DEV__) {
        console.log(`[API] ${response.status} ${response.config.url}`);
      }
      return response;
    },
    (error: AxiosError<APIError>) => {
      // Handle errors
      const apiError = handleAPIError(error);
      if (__DEV__) {
        console.error('[API] Response error:', JSON.stringify(apiError, null, 2));
        console.error('[API] Original error:', error.message);
        if (error.response) {
          console.error('[API] Status:', error.response.status);
          console.error('[API] Data:', JSON.stringify(error.response.data, null, 2));
        }
      }
      return Promise.reject(apiError);
    }
  );

  return client;
}

/**
 * Handle and normalize API errors
 */
function handleAPIError(error: AxiosError<APIError>): APIError {
  if (error.response) {
    // Server responded with error status
    const { status, data } = error.response;

    return {
      detail: data?.detail || error.message || 'An error occurred',
      status,
      code: data?.code,
    };
  } else if (error.request) {
    // Request was made but no response received
    return {
      detail: 'Network error: No response from server',
      status: 0,
      code: 'NETWORK_ERROR',
    };
  } else {
    // Something else happened
    return {
      detail: error.message || 'An unexpected error occurred',
      status: 0,
      code: 'UNKNOWN_ERROR',
    };
  }
}

/**
 * Global API client instance
 */
export const apiClient = createAPIClient();

/**
 * Helper to check if an error is a rate limit error (429)
 */
export function isRateLimitError(error: APIError): boolean {
  return error.status === 429;
}

/**
 * Helper to check if an error is a not found error (404)
 */
export function isNotFoundError(error: APIError): boolean {
  return error.status === 404;
}

/**
 * Helper to check if an error is a conflict error (409)
 */
export function isConflictError(error: APIError): boolean {
  return error.status === 409;
}

/**
 * Helper to check if an error is a gone error (410)
 */
export function isGoneError(error: APIError): boolean {
  return error.status === 410;
}

/**
 * Helper to check if an error is a network error
 */
export function isNetworkError(error: APIError): boolean {
  return error.code === 'NETWORK_ERROR';
}

export default apiClient;
