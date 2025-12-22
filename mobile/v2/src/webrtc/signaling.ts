/**
 * WebSocket Signaling
 *
 * Manages WebSocket connection to backend for WebRTC signaling.
 * Handles offer/answer exchange, ICE candidate exchange, and chat messages.
 */

import { API_CONFIG } from '@/utils/env';
import { useConnectionStore } from '@/state';
import type { SignalingMessage } from './types';
import { WebRTCError, WebRTCErrorCode } from './types';

/**
 * Signaling message handler
 */
export type SignalingMessageHandler = (message: SignalingMessage) => void;

/**
 * WebSocket signaling client
 */
export class SignalingClient {
  private ws: WebSocket | null = null;
  private token: string | null = null;
  private participantId: string | null = null;
  private messageHandlers: Set<SignalingMessageHandler> = new Set();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000; // Start with 1s
  private reconnectTimer: NodeJS.Timeout | null = null;

  /**
   * Connect to signaling server
   */
  async connect(token: string, participantId: string): Promise<void> {
    this.token = token;
    this.participantId = participantId;

    return new Promise((resolve, reject) => {
      try {
        const wsUrl = `${API_CONFIG.wsBaseUrl}/ws/sessions/${token}?participantId=${participantId}`;
        console.log('[Signaling] Connecting to:', wsUrl);

        useConnectionStore.getState().setSignalingState('connecting');

        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
          console.log('[Signaling] Connected');
          useConnectionStore.getState().setSignalingState('connected');
          this.reconnectAttempts = 0;
          this.reconnectDelay = 1000;
          resolve();
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event.data);
        };

        this.ws.onerror = (error) => {
          console.error('[Signaling] WebSocket error:', error);
          useConnectionStore
            .getState()
            .setSignalingState('error', 'WebSocket connection error');
          reject(
            new WebRTCError(
              WebRTCErrorCode.SIGNALING_CONNECTION_FAILED,
              'Failed to connect to signaling server'
            )
          );
        };

        this.ws.onclose = (event) => {
          console.log('[Signaling] Disconnected:', event.code, event.reason);
          useConnectionStore.getState().setSignalingState('disconnected');

          // Attempt reconnection if not a normal closure
          if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.scheduleReconnect();
          }
        };
      } catch (error) {
        console.error('[Signaling] Connection error:', error);
        useConnectionStore
          .getState()
          .setSignalingState('error', 'Failed to create WebSocket');
        reject(error);
      }
    });
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    console.log(
      `[Signaling] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`
    );

    this.reconnectTimer = setTimeout(() => {
      if (this.token && this.participantId) {
        this.connect(this.token, this.participantId).catch((error) => {
          console.error('[Signaling] Reconnection failed:', error);
        });
      }
    }, delay);
  }

  /**
   * Disconnect from signaling server
   */
  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      this.ws.close(1000, 'Client disconnecting');
      this.ws = null;
    }

    this.token = null;
    this.participantId = null;
    this.messageHandlers.clear();
    this.reconnectAttempts = 0;

    useConnectionStore.getState().setSignalingState('disconnected');
  }

  /**
   * Send a signaling message
   */
  send(message: any): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new WebRTCError(
        WebRTCErrorCode.SIGNALING_DISCONNECTED,
        'WebSocket is not connected'
      );
    }

    if (!this.participantId) {
      throw new WebRTCError(
        WebRTCErrorCode.INVALID_STATE,
        'Participant ID not set'
      );
    }

    const fullMessage = {
      ...message,
      participantId: this.participantId,
    };

    console.log('[Signaling] Sending:', fullMessage.type);
    this.ws.send(JSON.stringify(fullMessage));
  }

  /**
   * Register a message handler
   */
  onMessage(handler: SignalingMessageHandler): () => void {
    this.messageHandlers.add(handler);

    // Return unsubscribe function
    return () => {
      this.messageHandlers.delete(handler);
    };
  }

  /**
   * Handle incoming message
   */
  private handleMessage(data: string): void {
    try {
      const message = JSON.parse(data) as SignalingMessage;
      console.log('[Signaling] Received:', message.type);

      // Notify all handlers
      this.messageHandlers.forEach((handler) => {
        try {
          handler(message);
        } catch (error) {
          console.error('[Signaling] Handler error:', error);
        }
      });
    } catch (error) {
      console.error('[Signaling] Failed to parse message:', error);
    }
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}

/**
 * Singleton signaling client instance
 */
export const signalingClient = new SignalingClient();
