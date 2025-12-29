/**
 * WebRTC Manager
 *
 * High-level orchestration of WebRTC signaling, peer connection, and encryption.
 * Implements chat-first flow: text messaging via DataChannel, optional video invites.
 *
 * Extracted from session-view.tsx for modularity.
 */

import { SignalingClient } from './signaling';
import { PeerConnection } from './connection';
import {
  deriveKey,
  encryptMessage,
  decryptMessage,
  generateMessageId,
} from './encryption';
import type {
  SignalingMessage,
  DataChannelMessage,
  EncryptedMessage,
  CallState,
  TextMessage,
  CallMessage,
} from './types';

// ============================================================================
// Decrypted Message Type
// ============================================================================

export interface DecryptedMessage {
  messageId: string;
  participantId: string;
  role: string;
  content: string;
  createdAt: string;
}

// ============================================================================
// WebRTCManager Class
// ============================================================================

export class WebRTCManager {
  private signaling: SignalingClient | null = null;
  private connection: PeerConnection | null = null;
  private encryptionKey: CryptoKey | null = null;
  private token: string = '';
  private participantId: string = '';
  private isInitiator: boolean = false;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private callState: CallState = 'idle';

  // Callbacks for UI
  private onConnectedCallback: (() => void) | null = null;
  private onDisconnectedCallback: (() => void) | null = null;
  private onTextMessageCallback: ((message: DecryptedMessage) => void) | null = null;
  private onVideoInviteCallback: (() => void) | null = null;
  private onVideoAcceptedCallback: (() => void) | null = null;
  private onVideoEndedCallback: (() => void) | null = null;
  private onRemoteStreamCallback: ((stream: MediaStream) => void) | null = null;
  private onErrorCallback: ((error: Error) => void) | null = null;
  private onSessionEndedCallback: (() => void) | null = null;

  // ============================================================================
  // Initialization
  // ============================================================================

  /**
   * Initialize signaling and peer connection for text chat + optional video.
   *
   * @param token - Session token
   * @param participantId - Participant ID
   * @param wsBaseUrl - WebSocket base URL (e.g., ws://localhost:50001)
   */
  async initialize(
    token: string,
    participantId: string,
    wsBaseUrl: string
  ): Promise<void> {
    this.token = token;
    this.participantId = participantId;

    // Derive encryption key from token
    try {
      this.encryptionKey = await deriveKey(token);
      console.log('[WebRTCManager] Encryption key derived');
    } catch (error) {
      console.error('[WebRTCManager] Failed to derive encryption key:', error);
      throw error;
    }

    // Initialize signaling
    const wsUrl = `${wsBaseUrl}/ws/${token}/${participantId}`;
    this.signaling = new SignalingClient({ url: wsUrl });

    this.setupSignalingHandlers();
    this.signaling.connect();

    console.log('[WebRTCManager] Initialized');
  }

  /**
   * Initialize peer connection for text chat only (no video yet).
   * Called after signaling is connected and session is active.
   */
  async initializeForTextChat(): Promise<void> {
    if (this.connection) {
      console.warn('[WebRTCManager] Peer connection already initialized');
      return;
    }

    console.log('[WebRTCManager] Initializing peer connection for text chat');

    // Get ICE configuration
    const iceServers = this.getIceServers();
    const config: RTCConfiguration = {
      iceServers,
      iceCandidatePoolSize: 10,
    };

    // Create peer connection
    this.connection = new PeerConnection();
    this.connection.initialize(config, !this.isInitiator); // Guest is polite

    this.setupPeerConnectionHandlers();

    // If host (initiator), create data channel and send offer
    if (this.isInitiator) {
      console.log('[WebRTCManager] Host: Creating data channel and offer');
      this.connection.createDataChannel('chat');

      const offer = await this.connection.createOffer();
      this.signaling!.send({
        type: 'signal',
        signalType: 'offer',
        payload: offer,
      });
    }
  }

  /**
   * Get ICE servers from environment variables.
   * Matches implementation in /lib/webrtc.ts
   */
  private getIceServers(): RTCIceServer[] {
    const stunUrls = process.env.NEXT_PUBLIC_WEBRTC_STUN_URLS?.split(',') || [
      'stun:stun.l.google.com:19302',
    ];
    const turnUrls = process.env.NEXT_PUBLIC_WEBRTC_TURN_URLS?.split(',');
    const turnUser = process.env.NEXT_PUBLIC_WEBRTC_TURN_USER;
    const turnPassword = process.env.NEXT_PUBLIC_WEBRTC_TURN_PASSWORD;

    const iceServers: RTCIceServer[] = [{ urls: stunUrls }];

    if (turnUrls && turnUrls.length > 0 && turnUser && turnPassword) {
      iceServers.push({
        urls: turnUrls,
        username: turnUser,
        credential: turnPassword,
      });
    }

    return iceServers;
  }

  // ============================================================================
  // Signaling Handlers
  // ============================================================================

  private setupSignalingHandlers(): void {
    if (!this.signaling) return;

    this.signaling.onMessage(async (message: SignalingMessage) => {
      try {
        // Handle signal-wrapped messages
        if (message.type === 'signal') {
          const signalType = message.signalType;
          const payload = message.payload;

          switch (signalType) {
            case 'offer':
              await this.handleOffer(payload as RTCSessionDescriptionInit);
              break;

            case 'answer':
              await this.handleAnswer(payload as RTCSessionDescriptionInit);
              break;

            case 'ice-candidate':
            case 'iceCandidate':
              await this.handleIceCandidate(payload as RTCIceCandidateInit);
              break;

            case 'video-invite':
              this.handleVideoInvite();
              break;

            case 'video-accept':
              await this.handleVideoAccept();
              break;

            case 'video-end':
              this.handleVideoEnd();
              break;

            case 'message':
              await this.handleSignalingMessage(payload as any);
              break;

            default:
              console.log('[WebRTCManager] Unknown signal type:', signalType);
          }
        }
        // Handle direct message type
        else if (message.type === 'message') {
          await this.handleSignalingMessage(message as any);
        }
      } catch (error) {
        console.error('[WebRTCManager] Failed to handle signaling message:', error);
        if (this.onErrorCallback) {
          this.onErrorCallback(error instanceof Error ? error : new Error(String(error)));
        }
      }
    });

    this.signaling.onStatusUpdate((status) => {
      console.log('[WebRTCManager] Session status:', status.status);

      // Initialize peer connection when session becomes active with 2 participants
      const isActive = status.status === 'active';
      const participantCount = status.connectedParticipants?.length ?? 0;

      if (isActive && participantCount >= 2 && !this.connection) {
        console.log('[WebRTCManager] Session active with 2 participants - initializing peer connection');
        this.initializeForTextChat().catch((error) => {
          console.error('[WebRTCManager] Failed to initialize peer connection:', error);
        });
      }
    });

    this.signaling.onSessionClosed((reason) => {
      console.log('[WebRTCManager] Session closed:', reason);
      if (this.onSessionEndedCallback) {
        this.onSessionEndedCallback();
      }
    });

    this.signaling.onError((error) => {
      console.error('[WebRTCManager] Signaling error:', error);
      if (this.onErrorCallback) {
        this.onErrorCallback(error);
      }
    });
  }

  // ============================================================================
  // Peer Connection Handlers
  // ============================================================================

  private setupPeerConnectionHandlers(): void {
    if (!this.connection) return;

    // ICE candidate generation
    this.connection.setOnIceCandidate((candidate) => {
      this.signaling!.send({
        type: 'signal',
        signalType: 'ice-candidate',
        payload: candidate.toJSON(),
      });
    });

    // Remote track (video/audio)
    this.connection.setOnTrack((event) => {
      console.log('[WebRTCManager] Remote track received:', event.track.kind);
      const stream = event.streams[0];
      if (stream) {
        this.remoteStream = stream;
        if (this.onRemoteStreamCallback) {
          this.onRemoteStreamCallback(stream);
        }
      }
    });

    // Connection state changes
    this.connection.setOnConnectionStateChange((state) => {
      console.log('[WebRTCManager] Connection state:', state);
      if (state === 'connected' && this.onConnectedCallback) {
        this.onConnectedCallback();
      } else if (state === 'disconnected' || state === 'failed') {
        if (this.onDisconnectedCallback) {
          this.onDisconnectedCallback();
        }
      }
    });

    // Data channel open (text chat ready)
    this.connection.setOnDataChannelOpen(() => {
      console.log('[WebRTCManager] Data channel open - text chat ready');
      if (this.onConnectedCallback) {
        this.onConnectedCallback();
      }

      // Send capabilities announcement
      this.sendCapabilitiesAnnouncement();
    });

    // Data channel messages
    this.connection.setOnDataChannelMessage(async (message) => {
      await this.handleDataChannelMessage(message);
    });

    // Data channel timeout
    this.connection.setOnDataChannelTimeout(() => {
      console.error('[WebRTCManager] Data channel failed to open');
      if (this.onErrorCallback) {
        this.onErrorCallback(new Error('Data channel timeout'));
      }
    });

    // Negotiation needed (for renegotiation)
    this.connection.setOnNegotiationNeeded(async () => {
      if (!this.isInitiator) return;

      console.log('[WebRTCManager] Negotiation needed - creating offer');
      const offer = await this.connection!.createOffer();
      this.signaling!.send({
        type: 'signal',
        signalType: 'offer',
        payload: offer,
      });
    });
  }

  // ============================================================================
  // Message Handling
  // ============================================================================

  /**
   * Send encrypted text message via DataChannel.
   */
  async sendTextMessage(content: string): Promise<void> {
    if (!this.connection) {
      throw new Error('Peer connection not initialized');
    }

    if (!this.encryptionKey) {
      throw new Error('Encryption key not available');
    }

    try {
      const messageId = generateMessageId();
      const timestamp = Date.now();
      const encrypted = await encryptMessage(this.encryptionKey, content);

      // Send via DataChannel using browser-compatible format
      const message: TextMessage = {
        type: 'message',
        message: {
          sessionId: this.token,
          messageId,
          participantId: this.participantId,
          role: this.isInitiator ? 'host' : 'guest',
          createdAt: new Date(timestamp).toISOString(),
          encryptedContent: encrypted,
          hash: '',
          encryption: 'aes-gcm',
        },
      };

      this.connection.sendMessage(message);
      console.log('[WebRTCManager] Sent encrypted message via DataChannel');
    } catch (error) {
      console.error('[WebRTCManager] Failed to send text message:', error);
      throw error;
    }
  }

  /**
   * Handle incoming data channel message.
   */
  private async handleDataChannelMessage(message: DataChannelMessage): Promise<void> {
    switch (message.type) {
      case 'message':
        await this.handleTextMessage(message as TextMessage);
        break;

      case 'ack':
        // Message acknowledged by peer
        console.log('[WebRTCManager] Message acknowledged:', (message as any).messageId);
        break;

      case 'call':
        await this.handleCallMessage(message as CallMessage);
        break;

      case 'capabilities':
        console.log('[WebRTCManager] Peer capabilities:', message);
        break;

      default:
        console.log('[WebRTCManager] Unknown data channel message type:', message.type);
    }
  }

  /**
   * Handle incoming text message from DataChannel.
   */
  private async handleTextMessage(message: TextMessage): Promise<void> {
    if (!this.encryptionKey) {
      console.error('[WebRTCManager] Cannot decrypt message: no encryption key');
      return;
    }

    try {
      // Handle browser format: message.message.encryptedContent
      const browserMessage = message.message;
      if (browserMessage && browserMessage.encryptedContent) {
        const decrypted = await decryptMessage(
          this.encryptionKey,
          browserMessage.encryptedContent
        );

        const decryptedMessage: DecryptedMessage = {
          messageId: browserMessage.messageId,
          participantId: browserMessage.participantId,
          role: browserMessage.role,
          content: decrypted,
          createdAt: browserMessage.createdAt,
        };

        if (this.onTextMessageCallback) {
          this.onTextMessageCallback(decryptedMessage);
        }

        // Send ACK back
        this.connection!.sendMessage({
          type: 'ack',
          messageId: browserMessage.messageId,
        });
      }
    } catch (error) {
      console.error('[WebRTCManager] Failed to decrypt message:', error);
      if (this.onErrorCallback) {
        this.onErrorCallback(error instanceof Error ? error : new Error(String(error)));
      }
    }
  }

  /**
   * Handle incoming signaling message (fallback if DataChannel not open).
   */
  private async handleSignalingMessage(message: any): Promise<void> {
    if (!this.encryptionKey) {
      console.error('[WebRTCManager] Cannot decrypt message: no encryption key');
      return;
    }

    try {
      const { payload, messageId, timestamp } = message;
      const decrypted = await decryptMessage(this.encryptionKey, payload);

      const decryptedMessage: DecryptedMessage = {
        messageId,
        participantId: this.participantId,
        role: this.isInitiator ? 'host' : 'guest',
        content: decrypted,
        createdAt: new Date(timestamp).toISOString(),
      };

      if (this.onTextMessageCallback) {
        this.onTextMessageCallback(decryptedMessage);
      }
    } catch (error) {
      console.error('[WebRTCManager] Failed to decrypt signaling message:', error);
    }
  }

  // ============================================================================
  // Video Call Handling
  // ============================================================================

  /**
   * Invite remote peer to video call.
   * Starts local video and sends invite via DataChannel.
   */
  async inviteVideo(stream: MediaStream): Promise<void> {
    if (!this.connection) {
      throw new Error('Peer connection not initialized');
    }

    console.log('[WebRTCManager] Inviting peer to video call');

    this.localStream = stream;
    this.callState = 'requesting';

    // Add tracks to peer connection
    for (const track of stream.getTracks()) {
      this.connection.addTrack(track, stream);
    }

    // Send video invite via DataChannel (browser-compatible format)
    this.connection.sendMessage({
      type: 'call',
      action: 'request',
      from: this.participantId,
    } as CallMessage);
  }

  /**
   * Accept incoming video call.
   * Starts local video and sends acceptance via DataChannel.
   */
  async acceptVideo(stream: MediaStream): Promise<void> {
    if (!this.connection) {
      throw new Error('Peer connection not initialized');
    }

    console.log('[WebRTCManager] Accepting video call');

    this.localStream = stream;
    this.callState = 'connecting';

    // Add tracks to peer connection
    for (const track of stream.getTracks()) {
      this.connection.addTrack(track, stream);
    }

    // Send acceptance via DataChannel (browser-compatible format)
    this.connection.sendMessage({
      type: 'call',
      action: 'accept',
      from: this.participantId,
    } as CallMessage);
  }

  /**
   * Reject incoming video call.
   */
  rejectVideo(): void {
    if (!this.connection) return;

    console.log('[WebRTCManager] Rejecting video call');
    this.callState = 'idle';

    this.connection.sendMessage({
      type: 'call',
      action: 'reject',
      from: this.participantId,
    } as CallMessage);
  }

  /**
   * End active video call while keeping text chat.
   */
  endVideo(): void {
    if (!this.connection) return;

    console.log('[WebRTCManager] Ending video call');

    // Send video end via DataChannel
    this.connection.sendMessage({
      type: 'call',
      action: 'end',
      from: this.participantId,
    } as CallMessage);

    // Stop local tracks
    this.stopLocalTracks();

    this.callState = 'idle';

    if (this.onVideoEndedCallback) {
      this.onVideoEndedCallback();
    }
  }

  /**
   * Handle video invite from remote peer.
   */
  private handleVideoInvite(): void {
    console.log('[WebRTCManager] Received video invite');
    this.callState = 'incoming';

    if (this.onVideoInviteCallback) {
      this.onVideoInviteCallback();
    }
  }

  /**
   * Handle video acceptance from remote peer.
   */
  private async handleVideoAccept(): Promise<void> {
    console.log('[WebRTCManager] Remote peer accepted video');
    this.callState = 'active';

    if (this.onVideoAcceptedCallback) {
      this.onVideoAcceptedCallback();
    }

    // Create renegotiation offer to include video tracks
    if (this.isInitiator && this.connection) {
      const offer = await this.connection.createOffer();
      this.signaling!.send({
        type: 'signal',
        signalType: 'offer',
        payload: offer,
      });
    }
  }

  /**
   * Handle video end from remote peer.
   */
  private handleVideoEnd(): void {
    console.log('[WebRTCManager] Remote peer ended video');

    // Stop local tracks
    this.stopLocalTracks();

    this.callState = 'idle';

    if (this.onVideoEndedCallback) {
      this.onVideoEndedCallback();
    }
  }

  /**
   * Handle call control messages from DataChannel.
   */
  private async handleCallMessage(message: CallMessage): Promise<void> {
    const action = message.action;

    switch (action) {
      case 'request':
        this.handleVideoInvite();
        break;

      case 'accept':
        await this.handleVideoAccept();
        break;

      case 'reject':
        console.log('[WebRTCManager] Video request rejected');
        this.callState = 'idle';
        break;

      case 'cancel':
        console.log('[WebRTCManager] Video request cancelled');
        this.callState = 'idle';
        break;

      case 'end':
        this.handleVideoEnd();
        break;

      case 'busy':
        console.log('[WebRTCManager] Peer is busy');
        this.callState = 'idle';
        break;

      default:
        console.log('[WebRTCManager] Unknown call action:', action);
    }
  }

  // ============================================================================
  // Offer/Answer Handling
  // ============================================================================

  private async handleOffer(offer: RTCSessionDescriptionInit): Promise<void> {
    if (!this.connection) {
      console.log('[WebRTCManager] Received offer but no peer connection - initializing');
      await this.initializeForTextChat();
    }

    console.log('[WebRTCManager] Processing offer');
    await this.connection!.setRemoteDescription(offer);

    const answer = await this.connection!.createAnswer();
    this.signaling!.send({
      type: 'signal',
      signalType: 'answer',
      payload: answer,
    });
  }

  private async handleAnswer(answer: RTCSessionDescriptionInit): Promise<void> {
    if (!this.connection) {
      throw new Error('Peer connection not initialized');
    }

    console.log('[WebRTCManager] Processing answer');
    await this.connection.setRemoteDescription(answer);
  }

  private async handleIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    if (!this.connection) {
      console.log('[WebRTCManager] Received ICE candidate but no peer connection yet');
      return;
    }

    console.log('[WebRTCManager] Adding ICE candidate');
    await this.connection.addIceCandidate(candidate);
  }

  // ============================================================================
  // Capabilities Announcement
  // ============================================================================

  private sendCapabilitiesAnnouncement(): void {
    if (!this.connection) return;

    try {
      this.connection.sendMessage({
        type: 'capabilities',
        supportsEncryption: true,
      });
      console.log('[WebRTCManager] Sent capabilities announcement');
    } catch (error) {
      console.warn('[WebRTCManager] Failed to send capabilities:', error);
    }
  }

  // ============================================================================
  // Local Media Management
  // ============================================================================

  setLocalStream(stream: MediaStream): void {
    this.localStream = stream;
  }

  private stopLocalTracks(): void {
    if (!this.localStream) return;

    for (const track of this.localStream.getTracks()) {
      track.stop();
    }

    this.localStream = null;
  }

  // ============================================================================
  // Event Callbacks
  // ============================================================================

  onConnected(callback: () => void): void {
    this.onConnectedCallback = callback;
  }

  onDisconnected(callback: () => void): void {
    this.onDisconnectedCallback = callback;
  }

  onTextMessage(callback: (message: DecryptedMessage) => void): void {
    this.onTextMessageCallback = callback;
  }

  onVideoInvite(callback: () => void): void {
    this.onVideoInviteCallback = callback;
  }

  onVideoAccepted(callback: () => void): void {
    this.onVideoAcceptedCallback = callback;
  }

  onVideoEnded(callback: () => void): void {
    this.onVideoEndedCallback = callback;
  }

  onRemoteStream(callback: (stream: MediaStream) => void): void {
    this.onRemoteStreamCallback = callback;
  }

  onError(callback: (error: Error) => void): void {
    this.onErrorCallback = callback;
  }

  onSessionEnded(callback: () => void): void {
    this.onSessionEndedCallback = callback;
  }

  // ============================================================================
  // Cleanup
  // ============================================================================

  /**
   * End session and cleanup all resources.
   */
  endSession(): void {
    console.log('[WebRTCManager] Ending session');

    this.stopLocalTracks();

    if (this.connection) {
      this.connection.close();
      this.connection = null;
    }

    if (this.signaling) {
      this.signaling.disconnect();
      this.signaling = null;
    }

    this.encryptionKey = null;
    this.remoteStream = null;
    this.callState = 'idle';
  }

  cleanup(): void {
    this.endSession();
  }
}
