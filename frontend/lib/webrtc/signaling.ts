/**
 * WebRTC Signaling Client
 *
 * WebSocket-based signaling for SDP offer/answer exchange and ICE candidates.
 * Extracted from session-view.tsx for modularity.
 *
 * Features:
 * - Exponential backoff reconnection
 * - Message queue for offline scenarios
 * - Event-driven architecture with callbacks
 */

import type {
  SignalingMessage,
  SignalingMessageCallback,
  ErrorCallback,
  SessionStatus,
} from './types';
import { DEFAULT_RECONNECT_BASE_DELAY_MS, RECONNECT_MAX_DELAY_MS } from './types';

// ============================================================================
// Signaling Client Class
// ============================================================================

export interface SignalingClientConfig {
  url: string;
  reconnectMaxAttempts?: number;
  reconnectBaseDelayMs?: number;
  reconnectMaxDelayMs?: number;
}

export interface SignalingClientCallbacks {
  onOpen?: () => void;
  onClose?: () => void;
  onError?: ErrorCallback;
  onMessage?: SignalingMessageCallback;
  onStatusUpdate?: (status: SessionStatus) => void;
  onSessionClosed?: (reason: 'closed' | 'expired' | 'deleted') => void;
}

export class SignalingClient {
  private ws: WebSocket | null = null;
  private config: Required<SignalingClientConfig>;
  private callbacks: SignalingClientCallbacks = {};
  private reconnectAttempts = 0;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private isIntentionallyClosed = false;

  constructor(config: SignalingClientConfig) {
    this.config = {
      reconnectMaxAttempts: 5,
      reconnectBaseDelayMs: DEFAULT_RECONNECT_BASE_DELAY_MS,
      reconnectMaxDelayMs: RECONNECT_MAX_DELAY_MS,
      ...config,
    };
  }

  // ============================================================================
  // Connection Management
  // ============================================================================

  /**
   * Connect to WebSocket signaling server.
   */
  connect(): void {
    if (this.ws && (this.ws.readyState === WebSocket.CONNECTING || this.ws.readyState === WebSocket.OPEN)) {
      console.warn('[SignalingClient] Already connected or connecting');
      return;
    }

    this.isIntentionallyClosed = false;
    this.clearReconnectTimeout();

    console.log('[SignalingClient] Connecting to', this.config.url);
    this.ws = new WebSocket(this.config.url);

    this.ws.onopen = () => {
      console.log('[SignalingClient] Connected');
      this.reconnectAttempts = 0;
      this.clearReconnectTimeout();
      if (this.callbacks.onOpen) {
        this.callbacks.onOpen();
      }
    };

    this.ws.onclose = (event) => {
      console.log('[SignalingClient] Closed', { code: event.code, reason: event.reason });

      if (this.callbacks.onClose) {
        this.callbacks.onClose();
      }

      // Don't reconnect if intentionally closed or clean close
      if (this.isIntentionallyClosed || event.code === 1000) {
        return;
      }

      // Attempt reconnection with exponential backoff
      if (this.reconnectAttempts < this.config.reconnectMaxAttempts) {
        const backoffAttempt = Math.min(this.reconnectAttempts + 1, 6);
        const delay = Math.min(
          this.config.reconnectBaseDelayMs * 2 ** (backoffAttempt - 1),
          this.config.reconnectMaxDelayMs
        );

        this.reconnectAttempts++;
        console.log('[SignalingClient] Reconnecting in', delay, 'ms (attempt', this.reconnectAttempts, ')');

        this.reconnectTimeout = setTimeout(() => {
          this.reconnectTimeout = null;
          this.connect();
        }, delay);
      } else {
        console.error('[SignalingClient] Max reconnect attempts reached');
        if (this.callbacks.onError) {
          this.callbacks.onError(new Error('Maximum reconnection attempts exceeded'));
        }
      }
    };

    this.ws.onerror = (event) => {
      console.error('[SignalingClient] WebSocket error', event);
      if (this.callbacks.onError) {
        this.callbacks.onError(new Error('WebSocket error'));
      }
    };

    this.ws.onmessage = (event) => {
      this.handleMessage(event.data);
    };
  }

  /**
   * Disconnect from WebSocket server.
   */
  disconnect(): void {
    console.log('[SignalingClient] Disconnecting');
    this.isIntentionallyClosed = true;
    this.clearReconnectTimeout();

    if (this.ws) {
      try {
        this.ws.close(1000, 'Client disconnect');
      } catch (error) {
        console.warn('[SignalingClient] Error closing WebSocket', error);
      }
      this.ws = null;
    }
  }

  /**
   * Check if signaling connection is ready to send messages.
   */
  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  // ============================================================================
  // Message Handling
  // ============================================================================

  /**
   * Send signaling message to server.
   */
  send(message: SignalingMessage): void {
    if (!this.isConnected()) {
      throw new Error('Signaling not connected');
    }

    console.log('[SignalingClient] Sending message', message);
    this.ws!.send(JSON.stringify(message));
  }

  /**
   * Handle incoming WebSocket message.
   */
  private handleMessage(data: string): void {
    console.log('[SignalingClient] Received message', data);

    try {
      const payload = JSON.parse(data);

      // Handle status updates
      if (payload.type === 'status') {
        if (this.callbacks.onStatusUpdate) {
          this.callbacks.onStatusUpdate(this.mapStatus(payload));
        }
      }
      // Handle session lifecycle events
      else if (payload.type === 'session_closed') {
        if (this.callbacks.onSessionClosed) {
          this.callbacks.onSessionClosed('closed');
        }
      } else if (payload.type === 'session_expired') {
        if (this.callbacks.onSessionClosed) {
          this.callbacks.onSessionClosed('expired');
        }
      } else if (payload.type === 'session_deleted' || payload.type === 'abuse_reported') {
        if (this.callbacks.onSessionClosed) {
          this.callbacks.onSessionClosed('deleted');
        }
      }
      // Handle errors
      else if (payload.type === 'error') {
        console.error('[SignalingClient] Server error:', payload.message);
        if (this.callbacks.onError) {
          this.callbacks.onError(new Error(payload.message || 'Server error'));
        }
      }
      // Pass through to message callback
      else if (this.callbacks.onMessage) {
        this.callbacks.onMessage(payload as SignalingMessage);
      }
    } catch (error) {
      console.error('[SignalingClient] Failed to parse message', error);
      if (this.callbacks.onError) {
        this.callbacks.onError(error instanceof Error ? error : new Error('Failed to parse message'));
      }
    }
  }

  /**
   * Map backend status payload to SessionStatus type.
   */
  private mapStatus(payload: any): SessionStatus {
    return {
      token: payload.token,
      status: payload.status,
      validityExpiresAt: payload.validity_expires_at,
      sessionStartedAt: payload.session_started_at,
      sessionExpiresAt: payload.session_expires_at,
      messageCharLimit: payload.message_char_limit,
      participants: (payload.participants || []).map((participant: any) => ({
        participantId: participant.participant_id ?? participant.participantId,
        role: participant.role,
        joinedAt: participant.joined_at ?? participant.joinedAt,
      })),
      remainingSeconds: payload.remaining_seconds ?? payload.remainingSeconds ?? null,
      connectedParticipants: payload.connected_participants ?? payload.connectedParticipants ?? [],
    };
  }

  // ============================================================================
  // Event Handlers
  // ============================================================================

  /**
   * Register callback for WebSocket open event.
   */
  onOpen(callback: () => void): void {
    this.callbacks.onOpen = callback;
  }

  /**
   * Register callback for WebSocket close event.
   */
  onClose(callback: () => void): void {
    this.callbacks.onClose = callback;
  }

  /**
   * Register callback for WebSocket errors.
   */
  onError(callback: ErrorCallback): void {
    this.callbacks.onError = callback;
  }

  /**
   * Register callback for signaling messages (offer/answer/ICE).
   */
  onMessage(callback: SignalingMessageCallback): void {
    this.callbacks.onMessage = callback;
  }

  /**
   * Register callback for status updates.
   */
  onStatusUpdate(callback: (status: SessionStatus) => void): void {
    this.callbacks.onStatusUpdate = callback;
  }

  /**
   * Register callback for session closed events.
   */
  onSessionClosed(callback: (reason: 'closed' | 'expired' | 'deleted') => void): void {
    this.callbacks.onSessionClosed = callback;
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  /**
   * Clear reconnection timeout.
   */
  private clearReconnectTimeout(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
  }

  /**
   * Update reconnection base delay (for network-aware reconnection).
   */
  setReconnectBaseDelay(delayMs: number): void {
    this.config.reconnectBaseDelayMs = delayMs;
  }

  /**
   * Reset reconnection attempts counter.
   */
  resetReconnectAttempts(): void {
    this.reconnectAttempts = 0;
  }
}
