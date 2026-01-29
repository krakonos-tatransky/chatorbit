/**
 * WebRTC Manager
 *
 * High-level WebRTC orchestration that combines signaling and peer connection.
 * Supports chat-first flow: signaling for text, then optional video via invite.
 */

import { MediaStream } from 'react-native-webrtc';
import { SignalingClient, signalingClient } from './signaling';
import { PeerConnection } from './connection';
import { useMessagesStore, useSessionStore, useConnectionStore, decryptAndAddMessage } from '@/state';
import type {
  SignalingMessage,
  MediaConstraints,
  WebRTCConfig,
  DataChannelMessage,
  StatusMessage,
} from './types';
import { WebRTCError, WebRTCErrorCode } from './types';

/**
 * Video invite callback type
 */
export type VideoInviteCallback = () => void;

/**
 * Video accepted callback type (called when remote peer accepts our video invite)
 */
export type VideoAcceptedCallback = () => void;

/**
 * Video ended callback type (called when remote peer ends video)
 */
export type VideoEndedCallback = () => void;

/**
 * Session ended callback type (called when remote peer ends session)
 */
export type SessionEndedCallback = (reason?: string) => void;

/**
 * WebRTC manager
 */
export class WebRTCManager {
  private signaling: SignalingClient;
  private peerConnection: PeerConnection | null = null;
  private isInitiator = false;  // Session initiator (host)
  private isVideoInitiator = false;  // Video call initiator (who sent the invite)
  private token: string | null = null;
  private participantId: string | null = null;
  private videoStarted = false;
  private signalingInitialized = false;
  private peerConnectionInitialized = false;
  private pendingIceCandidates: RTCIceCandidateInit[] = [];
  private isProcessingOffer = false;
  private isCreatingOffer = false;  // Guards against concurrent offer creation
  private negotiationPending = false;
  private videoAcceptHandled = false;

  /**
   * Callback when remote peer sends video invite
   */
  public onVideoInvite?: VideoInviteCallback;

  /**
   * Callback when remote peer ends video (but keeps text chat)
   */
  public onVideoEnded?: VideoEndedCallback;

  /**
   * Callback when remote peer ends the session entirely
   */
  public onSessionEnded?: SessionEndedCallback;

  /**
   * Callback when remote peer accepts our video invite
   */
  public onVideoAccepted?: VideoAcceptedCallback;

  /**
   * Callback when remote peer declines our video invite
   */
  public onVideoDeclined?: () => void;

  /**
   * Callback when remote stream is received or cleared
   * This replaces the polling mechanism for more reliable stream updates
   */
  public onRemoteStream?: (stream: MediaStream | null) => void;

  constructor(signaling?: SignalingClient) {
    this.signaling = signaling || signalingClient;
  }

  /**
   * Initialize signaling connection only (for text chat)
   * Does NOT start video - use startVideo() for that
   */
  async initializeSignaling(
    token: string,
    participantId: string,
    isHost: boolean
  ): Promise<void> {
    // Check actual WebSocket connection state, not just our flag
    const isActuallyConnected = this.signaling.isConnected();

    // If we think we're initialized but WebSocket is not connected, reset state
    if (this.signalingInitialized && !isActuallyConnected) {
      console.log('[WebRTC] Signaling flag was set but WebSocket disconnected, resetting...');
      this.signalingInitialized = false;
      this.peerConnectionInitialized = false;
      // Close stale peer connection if any
      if (this.peerConnection) {
        this.peerConnection.close();
        this.peerConnection = null;
      }
    }

    // Guard against multiple initializations (only if actually connected)
    if (this.signalingInitialized && isActuallyConnected) {
      console.log('[WebRTC] Signaling already initialized and connected, skipping');
      return;
    }

    try {
      console.log('[WebRTC] Initializing signaling as', isHost ? 'host' : 'guest');

      // Clear any previous session's messages
      useMessagesStore.getState().clearMessages();

      this.token = token;
      this.participantId = participantId;
      this.isInitiator = isHost;
      this.pendingIceCandidates = [];
      this.isProcessingOffer = false;
      this.isCreatingOffer = false;
      this.negotiationPending = false;

      // Connect to signaling server
      await this.signaling.connect(token, participantId);

      // Setup signaling handlers for text messages and video invites
      this.setupSignalingHandlers();

      this.signalingInitialized = true;
      console.log('[WebRTC] Signaling initialized');
    } catch (error) {
      console.error('[WebRTC] Failed to initialize signaling:', error);
      throw error;
    }
  }

  /**
   * Start video/audio capture and add to existing peer connection
   * Called when user taps camera button or accepts video invite
   * Requires peer connection to be already initialized (via text chat connection)
   */
  async startVideo(
    config?: WebRTCConfig,
    mediaConstraints?: MediaConstraints
  ): Promise<MediaStream> {
    if (this.videoStarted) {
      console.log('[WebRTC] Video already started');
      return this.peerConnection!.getLocalStream()!;
    }

    if (!this.peerConnection) {
      throw new WebRTCError(
        WebRTCErrorCode.INVALID_STATE,
        'Peer connection not initialized - text chat must be connected first'
      );
    }

    try {
      console.log('[WebRTC] Starting video on existing peer connection');

      // Add local media stream to existing peer connection
      const localStream = await this.peerConnection.addLocalStream(mediaConstraints);

      this.videoStarted = true;
      console.log('[WebRTC] Video started');

      return localStream;
    } catch (error) {
      console.error('[WebRTC] Failed to start video:', error);
      throw error;
    }
  }

  /**
   * Send video invite to remote peer via DataChannel
   * Uses browser-compatible "call" protocol with action: "request"
   */
  sendVideoInvite(): void {
    console.log('[WebRTC] Sending video invite via DataChannel');

    // Mark ourselves as the video initiator - we're responsible for the renegotiation offer
    this.isVideoInitiator = true;

    if (this.peerConnection) {
      try {
        // Use browser-compatible call protocol
        this.peerConnection.sendRawMessage({
          type: 'call',
          action: 'request',
          from: this.participantId,
        });
        return;
      } catch (error) {
        console.log('[WebRTC] DataChannel not ready, falling back to signaling');
      }
    }
    // Fallback to signaling
    this.signaling.send({
      type: 'signal',
      signalType: 'video-invite',
      payload: {},
    });
  }

  /**
   * Decline a video invite from remote peer
   */
  declineVideoInvite(): void {
    console.log('[WebRTC] Declining video invite');

    // Try data channel first for faster delivery
    if (this.peerConnection) {
      try {
        this.peerConnection.sendRawMessage({
          type: 'video-decline',
          action: 'decline',
          from: this.participantId,
        });
        return;
      } catch (error) {
        console.log('[WebRTC] DataChannel not ready, falling back to signaling');
      }
    }
    // Fallback to signaling
    this.signaling.send({
      type: 'signal',
      signalType: 'video-decline',
      payload: {},
    });
  }

  /**
   * Send ICE candidate with queuing support
   */
  private sendIceCandidate(candidateData: RTCIceCandidateInit): void {
    // Queue if signaling not ready
    if (!this.signaling.isConnected()) {
      console.log('[WebRTC] Queuing ICE candidate (signaling not ready)');
      this.pendingIceCandidates.push(candidateData);
      return;
    }

    try {
      this.signaling.send({
        type: 'signal',
        signalType: 'ice-candidate',
        payload: candidateData,
      });
    } catch (error) {
      console.log('[WebRTC] Failed to send ICE candidate, queuing:', error);
      this.pendingIceCandidates.push(candidateData);
    }
  }

  /**
   * Flush pending ICE candidates
   */
  private flushPendingIceCandidates(): void {
    if (this.pendingIceCandidates.length === 0) return;

    console.log(`[WebRTC] Flushing ${this.pendingIceCandidates.length} pending ICE candidates`);

    const candidates = [...this.pendingIceCandidates];
    this.pendingIceCandidates = [];

    candidates.forEach((candidate) => {
      this.sendIceCandidate(candidate);
    });
  }

  /**
   * Accept video invite via DataChannel
   * Note: Data channel already exists from text chat connection
   * Uses browser-compatible "call" protocol with action: "accept"
   */
  async acceptVideoInvite(): Promise<void> {
    console.log('[WebRTC] Accepting video invite via DataChannel');

    // Send accept message via DataChannel using browser-compatible call protocol
    if (this.peerConnection) {
      try {
        this.peerConnection.sendRawMessage({
          type: 'call',
          action: 'accept',
          from: this.participantId,
        });
      } catch (error) {
        console.log('[WebRTC] DataChannel not ready, falling back to signaling');
        this.signaling.send({
          type: 'signal',
          signalType: 'video-accept',
          payload: {},
        });
      }
    }
    // Note: The caller (SessionScreen) will call startVideo() after this
    // which adds video tracks to the existing peer connection
  }

  /**
   * Start WebRTC session (legacy method for backwards compatibility)
   */
  async startSession(
    token: string,
    participantId: string,
    isHost: boolean,
    config?: WebRTCConfig,
    mediaConstraints?: MediaConstraints
  ): Promise<MediaStream> {
    try {
      console.log('[WebRTC] Starting session as', isHost ? 'host' : 'guest');

      this.token = token;
      this.participantId = participantId;
      this.isInitiator = isHost;

      // Connect to signaling server
      await this.signaling.connect(token, participantId);

      // Initialize peer connection
      this.peerConnection = new PeerConnection();
      await this.peerConnection.initialize(config);

      // Setup signaling handlers
      this.setupSignalingHandlers();

      // Setup data channel handlers
      this.setupDataChannelHandlers();

      // Add local media stream
      const localStream = await this.peerConnection.addLocalStream(mediaConstraints);

      // If host (initiator), create data channel and start offer
      if (this.isInitiator) {
        this.peerConnection.createDataChannel('chat');

        // Setup ICE candidate handler before creating offer
        this.peerConnection.onIceCandidate((candidate) => {
          this.signaling.send({
            type: 'ice-candidate',
            candidate: candidate.toJSON(),
          });
        });

        // Create and send offer
        const offer = await this.peerConnection.createOffer();
        this.signaling.send({
          type: 'offer',
          offer,
        });
      } else {
        // Guest: Setup ICE candidate handler
        this.peerConnection.onIceCandidate((candidate) => {
          this.signaling.send({
            type: 'ice-candidate',
            candidate: candidate.toJSON(),
          });
        });
      }

      // Setup remote stream handler - notify UI when stream arrives
      this.peerConnection.onRemoteStream((stream) => {
        console.log('[WebRTC] Remote stream received, notifying UI');
        if (this.onRemoteStream) {
          this.onRemoteStream(stream);
        }
      });

      this.videoStarted = true;
      return localStream;
    } catch (error) {
      console.error('[WebRTC] Failed to start session:', error);
      await this.cleanup();
      throw error;
    }
  }

  /**
   * Setup signaling message handlers
   */
  private setupSignalingHandlers(): void {
    this.signaling.onMessage(async (message: SignalingMessage) => {
      try {
        switch (message.type) {
          case 'offer':
            await this.handleOffer(message.offer);
            break;

          case 'answer':
            await this.handleAnswer(message.answer);
            break;

          case 'ice-candidate':
            await this.handleIceCandidate(message.candidate);
            break;

          case 'message':
            await this.handleChatMessage(message);
            break;

          case 'session-ended':
            await this.handleSessionEnded(message.reason);
            break;

          case 'session_deleted':
            // Backend sends this when remote peer ends session via API
            console.log('[WebRTC] Session deleted by remote peer');
            await this.handleSessionEnded('Session ended by other participant');
            break;

          case 'session_closed':
            console.log('[WebRTC] Session closed');
            await this.handleSessionEnded('Session closed');
            break;

          case 'session_expired':
            console.log('[WebRTC] Session expired');
            await this.handleSessionEnded('Session has expired');
            break;

          case 'video-invite':
            this.handleVideoInvite();
            break;

          case 'video-accept':
            await this.handleVideoAccept();
            break;

          case 'status':
            this.handleStatusUpdate(message as StatusMessage);
            break;

          case 'signal':
            // Handle signal-wrapped messages from backend
            await this.handleSignalMessage(message);
            break;

          case 'error':
            console.error('[WebRTC] Signaling error:', message.error);
            break;
        }
      } catch (error) {
        console.error('[WebRTC] Failed to handle signaling message:', error);
      }
    });
  }

  /**
   * Handle video invite from remote peer
   */
  private handleVideoInvite(): void {
    console.log('[WebRTC] Received video invite');
    if (this.onVideoInvite) {
      this.onVideoInvite();
    }
  }

  /**
   * Handle video end from remote peer
   */
  private handleVideoEnd(): void {
    console.log('[WebRTC] Remote peer ended video');

    // Stop local video tracks and clear remote stream (keep data channel for text chat)
    if (this.peerConnection) {
      this.peerConnection.stopVideoTracks();
      this.peerConnection.clearRemoteStream();  // Clear frozen remote video
    }

    // Reset video state but keep peer connection connected
    this.videoStarted = false;
    this.videoAcceptHandled = false;  // Reset for next video call
    this.isVideoInitiator = false;  // Reset for next video call

    // Notify UI that remote stream is cleared
    if (this.onRemoteStream) {
      this.onRemoteStream(null);
    }

    // Notify UI
    if (this.onVideoEnded) {
      this.onVideoEnded();
    }
  }

  /**
   * Handle video decline from remote peer
   * Called when we sent a video invite and the remote peer declined
   */
  private handleVideoDecline(): void {
    console.log('[WebRTC] Remote peer declined video invite');

    // Reset video initiator state
    this.isVideoInitiator = false;

    // Notify UI
    if (this.onVideoDeclined) {
      this.onVideoDeclined();
    }
  }

  /**
   * Handle video accept from remote peer
   *
   * This is called when WE sent the video invite and the remote peer accepted.
   * Since we initiated the call, we are responsible for creating a renegotiation offer
   * to include the video tracks we've already added to the connection.
   */
  private async handleVideoAccept(): Promise<void> {
    // Prevent duplicate handling - browser sends accept via both data channel and signaling
    if (this.videoAcceptHandled) {
      console.log('[WebRTC] Video accept already handled, ignoring duplicate');
      return;
    }
    this.videoAcceptHandled = true;

    console.log('[WebRTC] Remote peer accepted video - creating renegotiation offer');

    // Notify UI that video call is starting
    if (this.onVideoAccepted) {
      this.onVideoAccepted();
    }

    // Create renegotiation offer to include video tracks
    // Data channel already exists from text chat connection
    if (this.peerConnection) {
      this.isCreatingOffer = true;
      try {
        const offer = await this.peerConnection.createOffer();
        this.signaling.send({
          type: 'signal',
          signalType: 'offer',
          payload: offer,  // Send full RTCSessionDescriptionInit { type, sdp }
        });
        console.log('[WebRTC] Renegotiation offer sent after video accept');
      } catch (error) {
        console.error('[WebRTC] Failed to create renegotiation offer after video accept:', error);
      } finally {
        this.isCreatingOffer = false;
      }
    } else {
      console.error('[WebRTC] No peer connection to create offer');
    }
  }

  /**
   * Handle session status update from server
   */
  private handleStatusUpdate(message: StatusMessage): void {
    const participantCount = Array.isArray(message.connected_participants)
      ? message.connected_participants.length
      : 0;

    console.log('[WebRTC] Status update received:', {
      status: message.status,
      participantCount,
      remaining_seconds: message.remaining_seconds,
    });

    const isSessionActive = message.status === 'active';
    const connectionStore = useConnectionStore.getState();

    // Update connection state based on session status and participant count
    if (isSessionActive && participantCount >= 2) {
      console.log('[WebRTC] Session is active with 2 participants');

      // Initialize peer connection for text chat when both participants are connected
      if (!this.peerConnectionInitialized) {
        console.log('[WebRTC] Initializing peer connection for text chat');
        this.initializePeerConnectionForText().catch((error) => {
          console.error('[WebRTC] Failed to initialize peer connection:', error);
        });
      }
    } else if (isSessionActive && participantCount === 1) {
      console.log('[WebRTC] Session active but waiting for peer');
      connectionStore.setConnectionState('connecting');
    } else if (!isSessionActive) {
      console.log('[WebRTC] Session is not active');
      connectionStore.setConnectionState('disconnected');
    }

    // Update session store if session became active
    if (isSessionActive && this.token) {
      const sessionStore = useSessionStore.getState();
      if (sessionStore.status !== 'active') {
        console.log('[WebRTC] Updating session status to active');
        // Fetch latest session status from server to get timing info
        sessionStore.updateSessionStatus(this.token).catch((error) => {
          console.error('[WebRTC] Failed to update session status:', error);
        });
      }
    }
  }

  /**
   * Initialize peer connection for text chat (called when 2 participants connect)
   * Host creates data channel and sends offer
   * Guest waits for offer and creates answer (handled by handleOffer)
   */
  private async initializePeerConnectionForText(): Promise<void> {
    if (this.peerConnectionInitialized) {
      console.log('[WebRTC] Peer connection already initialized');
      return;
    }

    try {
      console.log('[WebRTC] Creating peer connection for text chat as', this.isInitiator ? 'host' : 'guest');
      this.peerConnectionInitialized = true;

      this.peerConnection = new PeerConnection();
      await this.peerConnection.initialize();

      // Setup ICE candidate handler
      this.peerConnection.onIceCandidate((candidate) => {
        this.sendIceCandidate(candidate.toJSON());
      });

      // Recommendation #1: Register negotiation callback
      // CRITICAL: Only the video initiator (who sent the invite) should create renegotiation offers.
      // The video callee must wait for the caller's offer after adding video tracks.
      // For text-only chat, only the session host creates offers.
      this.peerConnection.onNegotiationNeeded(async () => {
        if (!this.peerConnection) return;

        // Determine if we should create the offer based on context:
        // - For video renegotiation: only the video initiator creates offers
        // - For initial text chat: only the session host creates offers
        // - The video callee's negotiationneeded event should be ignored
        const shouldCreateOffer = this.videoStarted ? this.isVideoInitiator : this.isInitiator;

        if (!shouldCreateOffer) {
          console.log('[WebRTC] Negotiation needed but not the appropriate initiator - waiting for peer offer');
          return;
        }

        // Don't create offer if we're currently processing a remote offer
        // This prevents race conditions during offer collision handling
        if (this.isProcessingOffer) {
          console.log('[WebRTC] Negotiation needed but processing offer - deferring');
          this.negotiationPending = true;
          return;
        }

        // Check signaling state - only create offer if we're in stable state
        const signalingState = this.peerConnection.getSignalingState();
        if (signalingState && signalingState !== 'stable') {
          console.log(`[WebRTC] Negotiation needed but signaling state is ${signalingState} - deferring`);
          this.negotiationPending = true;
          return;
        }

        // Don't create offer if we're already creating one (race condition guard)
        if (this.isCreatingOffer) {
          console.log('[WebRTC] Negotiation needed but already creating offer - deferring');
          this.negotiationPending = true;
          return;
        }

        console.log('[WebRTC] Negotiation needed - creating new offer (video initiator:', this.isVideoInitiator, ')');
        this.negotiationPending = false;
        this.isCreatingOffer = true;
        try {
          const offer = await this.peerConnection.createOffer();
          this.signaling.send({
            type: 'signal',
            signalType: 'offer',
            payload: offer,
          });
          console.log('[WebRTC] Renegotiation offer sent (triggered by negotiationneeded)');
        } catch (error) {
          console.error('[WebRTC] Failed to create renegotiation offer:', error);
        } finally {
          this.isCreatingOffer = false;
        }
      });

      // Recommendation #5: Register ICE connection failure callback
      this.peerConnection.onIceConnectionFailed(() => {
        console.log('[WebRTC] ICE connection failed - attempting recovery');
        // Attempt ICE restart
        this.attemptIceRestart();
      });

      // Register ICE connection disconnected callback (10s timeout handled in connection.ts)
      this.peerConnection.onIceConnectionDisconnected(() => {
        console.log('[WebRTC] ICE connection disconnected for >10s - attempting recovery');
        // Attempt ICE restart
        this.attemptIceRestart();
      });

      // Setup data channel handlers (for receiving messages)
      this.setupDataChannelHandlers();

      if (this.isInitiator) {
        // Host: Create data channel and send offer
        console.log('[WebRTC] Host: Creating data channel and offer');
        this.peerConnection.createDataChannel('chat');

        // Set flag before creating offer to prevent negotiationneeded race condition
        this.isCreatingOffer = true;
        try {
          const offer = await this.peerConnection.createOffer();
          this.signaling.send({
            type: 'signal',
            signalType: 'offer',
            payload: offer,  // Send full RTCSessionDescriptionInit { type, sdp }
          });
          console.log('[WebRTC] Host: Offer sent for text chat');
        } finally {
          this.isCreatingOffer = false;
        }
      }
      // Guest: Wait for offer (handled by handleOffer which will create peer connection if needed)

    } catch (error) {
      console.error('[WebRTC] Failed to initialize peer connection for text:', error);
      this.peerConnectionInitialized = false;
      throw error;
    }
  }

  /**
   * Handle signal-wrapped messages from backend
   */
  private async handleSignalMessage(message: any): Promise<void> {
    const signalType = message.signalType;
    const payload = message.payload;

    console.log('[WebRTC] Received signal:', signalType);

    switch (signalType) {
      case 'message':
        // Handle chat message wrapped in signal
        if (this.token && payload) {
          await decryptAndAddMessage(
            this.token,
            payload.payload,
            payload.messageId,
            payload.timestamp
          );
        }
        break;

      case 'offer':
        if (payload?.sdp) {
          await this.handleOffer({ type: 'offer', sdp: payload.sdp });
        }
        break;

      case 'answer':
        if (payload?.sdp) {
          await this.handleAnswer({ type: 'answer', sdp: payload.sdp });
        }
        break;

      case 'ice-candidate':
      case 'iceCandidate':  // Browser sends camelCase
        if (payload) {
          await this.handleIceCandidate(payload);
        }
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

      case 'video-decline':
        this.handleVideoDecline();
        break;

      default:
        console.log('[WebRTC] Unknown signal type:', signalType);
    }
  }

  /**
   * Setup data channel message handlers
   */
  private setupDataChannelHandlers(): void {
    if (!this.peerConnection) return;

    // Set connection state to 'connected' when data channel opens
    this.peerConnection.onDataChannelOpen(() => {
      console.log('[WebRTC] Data channel opened - text chat ready');
      useConnectionStore.getState().setConnectionState('connected');
    });

    this.peerConnection.onDataChannelMessage(async (message: DataChannelMessage) => {
      try {
        switch (message.type) {
          case 'message':
            // Decrypt and add to messages store
            if (this.token) {
              // Handle both mobile format (payload) and browser format (message.encryptedContent)
              const browserMessage = (message as any).message;
              const payload = message.payload || browserMessage?.encryptedContent;
              const messageId = message.messageId || browserMessage?.messageId;
              const timestamp = message.timestamp || (browserMessage?.createdAt ? new Date(browserMessage.createdAt).getTime() : Date.now());

              if (payload && messageId) {
                await decryptAndAddMessage(
                  this.token,
                  payload,
                  messageId,
                  timestamp
                );

                // Recommendation #2: Send ACK message back to browser
                if (this.peerConnection) {
                  try {
                    this.peerConnection.sendRawMessage({
                      type: 'ack',
                      messageId: messageId,
                    });
                    console.log('[WebRTC] Sent ACK for message:', messageId);
                  } catch (error) {
                    console.log('[WebRTC] Failed to send ACK (DataChannel not ready):', error);
                  }
                }
              } else {
                console.warn('[WebRTC] Received message with missing payload or messageId:', message);
              }
            }
            break;

          case 'ack':
            // Mark message as sent
            useMessagesStore.getState().markMessageSent(message.messageId);
            break;

          case 'typing':
            // Handle typing indicator (future enhancement)
            break;

          case 'capabilities' as any:
            // Handle browser capabilities announcement
            console.log('[WebRTC] Received capabilities from browser:', message);
            // Browser is announcing encryption support - we can ignore for now
            break;

          case 'call' as any:
            // Handle browser-compatible call protocol
            await this.handleCallMessage(message as any);
            break;

          case 'video-invite' as any:
            // Handle video invite from remote peer (mobile-to-mobile compatibility)
            console.log('[WebRTC] Received video invite via DataChannel');
            this.handleVideoInvite();
            break;

          case 'video-accept' as any:
            // Handle video accept from remote peer (mobile-to-mobile compatibility)
            console.log('[WebRTC] Received video accept via DataChannel');
            await this.handleVideoAccept();
            break;

          case 'video-end' as any:
            // Handle video end from remote peer (mobile-to-mobile compatibility)
            console.log('[WebRTC] Received video end via DataChannel');
            this.handleVideoEnd();
            break;

          case 'video-decline' as any:
            // Handle video decline from remote peer (mobile-to-mobile compatibility)
            console.log('[WebRTC] Received video decline via DataChannel');
            this.handleVideoDecline();
            break;
        }
      } catch (error) {
        console.error('[WebRTC] Failed to handle data channel message:', error);
      }
    });
  }

  /**
   * Handle browser-compatible "call" protocol messages
   */
  private async handleCallMessage(message: { type: 'call'; action: string; from?: string }): Promise<void> {
    const action = message.action;
    console.log('[WebRTC] Received call message:', action);

    switch (action) {
      case 'request':
        // Browser is requesting video call - treat as video invite
        this.handleVideoInvite();
        break;

      case 'accept':
        // Browser accepted our video request
        await this.handleVideoAccept();
        break;

      case 'reject':
        // Browser rejected our video request
        console.log('[WebRTC] Video request rejected by peer');
        // Could notify UI here if needed
        break;

      case 'cancel':
        // Browser cancelled their video request
        console.log('[WebRTC] Video request cancelled by peer');
        // Could notify UI here if needed
        break;

      case 'end':
        // Browser ended video call
        this.handleVideoEnd();
        break;

      case 'busy':
        // Browser is busy (already in a call)
        console.log('[WebRTC] Peer is busy');
        // Could notify UI here if needed
        break;

      case 'renegotiate':
        // Browser (guest) wants to renegotiate - if we're host, create offer
        console.log('[WebRTC] Received renegotiate request from browser');
        if (this.isInitiator && this.peerConnection && !this.isCreatingOffer) {
          this.isCreatingOffer = true;
          try {
            const offer = await this.peerConnection.createOffer();
            this.signaling.send({
              type: 'signal',
              signalType: 'offer',
              payload: offer,
            });
            console.log('[WebRTC] Renegotiation offer sent (triggered by browser request)');
          } catch (error) {
            console.error('[WebRTC] Failed to create renegotiation offer:', error);
          } finally {
            this.isCreatingOffer = false;
          }
        }
        break;

      default:
        console.log('[WebRTC] Unknown call action:', action);
    }
  }

  /**
   * Handle incoming offer
   */
  private async handleOffer(offer: RTCSessionDescriptionInit): Promise<void> {
    // Prevent processing duplicate offers concurrently
    if (this.isProcessingOffer) {
      console.log('[WebRTC] Already processing an offer, ignoring duplicate');
      return;
    }

    if (!this.peerConnection) {
      console.log('[WebRTC] Received offer but no peer connection - initializing as guest');
      // Initialize peer connection on-demand for guest
      this.peerConnection = new PeerConnection();
      await this.peerConnection.initialize();
      this.peerConnectionInitialized = true;

      // Setup ICE candidate handler with queuing
      this.peerConnection.onIceCandidate((candidate) => {
        this.sendIceCandidate(candidate.toJSON());
      });

      // Setup remote stream handler - notify UI when stream arrives
      this.peerConnection.onRemoteStream((stream) => {
        console.log('[WebRTC] Remote stream received, notifying UI');
        if (this.onRemoteStream) {
          this.onRemoteStream(stream);
        }
      });

      // Setup data channel handlers
      this.setupDataChannelHandlers();
    }

    // Check signaling state - only process offer if in appropriate state
    const signalingState = this.peerConnection.getSignalingState();
    if (signalingState && signalingState !== 'stable' && signalingState !== 'have-local-offer') {
      console.log(`[WebRTC] Ignoring offer in signaling state: ${signalingState}`);
      return;
    }

    // Handle "glare" (offer collision) - if we already sent an offer, use rollback
    // This aligns with browser implementation for cross-platform compatibility
    if (signalingState === 'have-local-offer') {
      console.log('[WebRTC] Offer collision detected - rolling back local offer to accept remote');
      // Use rollback pattern (compatible with browser implementation)
      // This ensures both mobile-browser and browser-mobile connections work
      await this.peerConnection.rollback();

      // After rollback, check if we're in stable state to continue
      const newState = this.peerConnection.getSignalingState();
      if (newState && newState !== 'stable') {
        console.log(`[WebRTC] After rollback, signaling state is ${newState} - deferring offer`);
        // Store for later processing when stable
        return;
      }
    }

    this.isProcessingOffer = true;

    try {
      console.log('[WebRTC] Processing offer');
      await this.peerConnection.setRemoteDescription(offer);

      // Create and send answer
      const answer = await this.peerConnection.createAnswer();
      this.signaling.send({
        type: 'signal',
        signalType: 'answer',
        payload: answer,  // Send full RTCSessionDescriptionInit { type, sdp }
      });

      // Flush any pending ICE candidates now that signaling is stable
      this.flushPendingIceCandidates();
    } finally {
      this.isProcessingOffer = false;

      // Process any pending negotiation that was deferred during offer processing
      if (this.negotiationPending && this.peerConnection && !this.isCreatingOffer) {
        const signalingState = this.peerConnection.getSignalingState();
        if (signalingState === 'stable') {
          console.log('[WebRTC] Processing deferred negotiation after offer handling');
          this.negotiationPending = false;
          this.isCreatingOffer = true;
          try {
            const offer = await this.peerConnection.createOffer();
            this.signaling.send({
              type: 'signal',
              signalType: 'offer',
              payload: offer,
            });
            console.log('[WebRTC] Deferred renegotiation offer sent');
          } catch (error) {
            console.error('[WebRTC] Failed to create deferred renegotiation offer:', error);
          } finally {
            this.isCreatingOffer = false;
          }
        }
      }
    }
  }

  /**
   * Handle incoming answer
   */
  private async handleAnswer(answer: RTCSessionDescriptionInit): Promise<void> {
    if (!this.peerConnection) {
      throw new WebRTCError(
        WebRTCErrorCode.INVALID_STATE,
        'Peer connection not initialized'
      );
    }

    // Check signaling state - only process answer if we're expecting one
    const signalingState = this.peerConnection.getSignalingState();
    if (signalingState && signalingState !== 'have-local-offer') {
      console.log(`[WebRTC] Ignoring answer in signaling state: ${signalingState}`);
      return;
    }

    console.log('[WebRTC] Processing answer');
    await this.peerConnection.setRemoteDescription(answer);

    // Flush any pending ICE candidates now that signaling is stable
    this.flushPendingIceCandidates();
  }

  /**
   * Handle incoming ICE candidate
   */
  private async handleIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    if (!this.peerConnection) {
      console.log('[WebRTC] Received ICE candidate but no peer connection yet, ignoring');
      return;
    }

    console.log('[WebRTC] Received ICE candidate');
    await this.peerConnection.addIceCandidate(candidate);
  }

  /**
   * Handle incoming chat message
   */
  private async handleChatMessage(message: SignalingMessage & { type: 'message' }): Promise<void> {
    if (!this.token) {
      console.error('[WebRTC] Cannot handle chat message: no token');
      return;
    }

    console.log('[WebRTC] Received chat message via signaling');

    // Decrypt and add to messages store
    await decryptAndAddMessage(
      this.token,
      message.payload,
      message.messageId,
      message.timestamp
    );
  }

  /**
   * Handle session ended (triggered by remote peer ending session)
   */
  private async handleSessionEnded(reason?: string): Promise<void> {
    console.log('[WebRTC] Session ended by remote peer:', reason);

    // Notify UI before cleanup (so it can show modal)
    if (this.onSessionEnded) {
      this.onSessionEnded(reason);
    }

    await this.endSession();
  }

  /**
   * Send encrypted message via data channel (P2P, no backend relay)
   */
  async sendMessage(content: string): Promise<void> {
    if (!this.token) {
      throw new WebRTCError(
        WebRTCErrorCode.INVALID_STATE,
        'No active session'
      );
    }

    if (!this.peerConnection) {
      throw new WebRTCError(
        WebRTCErrorCode.NOT_CONNECTED,
        'No peer connection available'
      );
    }

    // Encrypt message
    const encrypted = await useMessagesStore.getState().sendMessage(this.token, content);

    // Get session info for browser-compatible format
    const sessionState = useSessionStore.getState();
    const participantId = this.participantId || sessionState.participantId || '';
    const role = sessionState.role || 'guest';

    // Browser expects { type: 'message', message: { ... } }
    const browserMessage = {
      type: 'message',
      message: {
        sessionId: this.token,
        messageId: encrypted.messageId,
        participantId: participantId,
        role: role,
        createdAt: new Date(encrypted.timestamp).toISOString(),
        encryptedContent: encrypted.payload,
        hash: '', // Optional - browser skips verification if empty
        encryption: 'aes-gcm',
      },
    };

    this.peerConnection.sendRawMessage(browserMessage);
    console.log('[WebRTC] Message sent via data channel');
  }

  /**
   * Toggle local audio
   */
  toggleAudio(enabled: boolean): void {
    this.peerConnection?.toggleAudio(enabled);
  }

  /**
   * Toggle local video
   */
  toggleVideo(enabled: boolean): void {
    this.peerConnection?.toggleVideo(enabled);
  }

  /**
   * Switch between front and back camera
   * @returns true if switch was successful, false otherwise
   */
  async switchCamera(): Promise<boolean> {
    if (!this.peerConnection) {
      console.log('[WebRTC] No peer connection - cannot switch camera');
      return false;
    }
    return this.peerConnection.switchCamera();
  }

  /**
   * Stop video chat while keeping text chat connected.
   * Removes video/audio tracks but keeps peer connection and data channel open.
   * Notifies remote peer so they also stop video.
   * Uses browser-compatible "call" protocol with action: "end"
   */
  stopVideo(): void {
    console.log('[WebRTC] Stopping video (keeping text chat via DataChannel)');

    // Notify remote peer that video is ending via DataChannel using browser-compatible call protocol
    if (this.peerConnection) {
      try {
        this.peerConnection.sendRawMessage({
          type: 'call',
          action: 'end',
          from: this.participantId,
        });
      } catch (error) {
        // Fallback to signaling if data channel not ready
        console.log('[WebRTC] DataChannel not ready, using signaling for video-end');
        if (this.signaling.isConnected()) {
          this.signaling.send({
            type: 'signal',
            signalType: 'video-end',
            payload: {},
          });
        }
      }
    }

    // Stop video tracks only (keep data channel open for text chat)
    if (this.peerConnection) {
      this.peerConnection.stopVideoTracks();
      this.peerConnection.clearRemoteStream();
    }

    // Reset video state but keep peer connection and signaling connected
    this.videoStarted = false;
    this.videoAcceptHandled = false;  // Reset for next video call (fixes reinvite audio bug)
    this.isVideoInitiator = false;  // Reset for next video call
  }

  /**
   * Get local stream
   */
  getLocalStream(): MediaStream | null {
    return this.peerConnection?.getLocalStream() || null;
  }

  /**
   * Get remote stream
   */
  getRemoteStream(): MediaStream | null {
    return this.peerConnection?.getRemoteStream() || null;
  }

  /**
   * Attempt connection recovery (public method for AppState/network change handling)
   * Called when app returns from background or network changes
   */
  attemptConnectionRecovery(): void {
    if (!this.peerConnection) {
      console.log('[WebRTC] No peer connection to recover');
      return;
    }

    const iceState = this.peerConnection.getIceConnectionState();
    console.log('[WebRTC] Checking connection state for recovery:', iceState);

    // If connection is disconnected or failed, attempt ICE restart immediately
    if (iceState === 'disconnected' || iceState === 'failed') {
      console.log('[WebRTC] Connection needs recovery, attempting ICE restart');
      this.attemptIceRestart();
    } else if (iceState === 'connected' || iceState === 'completed') {
      console.log('[WebRTC] Connection is healthy, no recovery needed');
    } else if (iceState === 'checking' || iceState === 'new') {
      // After waking from sleep, state might be stale - give it a moment then recheck
      console.log('[WebRTC] Connection state:', iceState, '- rechecking in 1s');
      setTimeout(() => {
        const currentState = this.peerConnection?.getIceConnectionState();
        if (currentState === 'disconnected' || currentState === 'failed') {
          console.log('[WebRTC] Connection degraded after recheck, attempting recovery');
          this.attemptIceRestart();
        } else if (currentState === 'connected' || currentState === 'completed') {
          console.log('[WebRTC] Connection recovered on its own');
        }
      }, 1000);
    } else {
      console.log('[WebRTC] Connection state:', iceState, '- monitoring');
    }
  }

  /**
   * Recommendation #5: Attempt ICE restart on connection failure
   * Progressive recovery: ICE restart → full reconnection
   * Matches browser implementation with restartIce() + iceRestart flag
   */
  private async attemptIceRestart(): Promise<void> {
    if (!this.peerConnection) {
      console.log('[WebRTC] Cannot restart ICE (no peer connection)');
      return;
    }

    // Only initiator (or video initiator during video) should create restart offers
    const shouldCreateOffer = this.videoStarted ? this.isVideoInitiator : this.isInitiator;
    if (!shouldCreateOffer) {
      console.log('[WebRTC] Cannot restart ICE (not the appropriate initiator)');
      return;
    }

    // Guard against concurrent offer creation
    if (this.isCreatingOffer) {
      console.log('[WebRTC] Cannot restart ICE (already creating offer)');
      return;
    }

    this.isCreatingOffer = true;
    try {
      console.log('[WebRTC] Attempting ICE restart...');

      // First, call restartIce() if available (like browser does)
      this.peerConnection.restartIce();

      // Then create offer with iceRestart: true flag
      const offer = await this.peerConnection.createOffer({ iceRestart: true });
      this.signaling.send({
        type: 'signal',
        signalType: 'offer',
        payload: offer,
      });
      console.log('[WebRTC] ICE restart offer sent');
    } catch (error) {
      console.error('[WebRTC] ICE restart failed:', error);
      // If ICE restart fails, attempt full peer connection reset
      console.log('[WebRTC] Attempting full peer connection reset...');
      await this.resetPeerConnection();
    } finally {
      this.isCreatingOffer = false;
    }
  }

  /**
   * Reset peer connection completely (last resort recovery)
   */
  private async resetPeerConnection(): Promise<void> {
    if (!this.token || !this.participantId) {
      console.log('[WebRTC] Cannot reset peer connection (no session info)');
      return;
    }

    try {
      console.log('[WebRTC] Resetting peer connection...');

      // Close existing peer connection
      if (this.peerConnection) {
        this.peerConnection.close();
        this.peerConnection = null;
      }

      // Reset flags
      this.peerConnectionInitialized = false;
      this.pendingIceCandidates = [];
      this.isProcessingOffer = false;
      this.isCreatingOffer = false;

      // Reinitialize peer connection
      await this.initializePeerConnectionForText();
      console.log('[WebRTC] Peer connection reset complete');
    } catch (error) {
      console.error('[WebRTC] Failed to reset peer connection:', error);
    }
  }

  /**
   * End session
   */
  async endSession(): Promise<void> {
    console.log('[WebRTC] Ending session');
    await this.cleanup();
  }

  /**
   * Cleanup resources
   */
  private async cleanup(): Promise<void> {
    // Close peer connection
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    // Disconnect signaling
    this.signaling.disconnect();

    // Clear messages when session ends
    useMessagesStore.getState().clearMessages();

    // Clear session data
    this.token = null;
    this.participantId = null;
    this.isInitiator = false;
    this.isVideoInitiator = false;
    this.videoStarted = false;
    this.signalingInitialized = false;
    this.peerConnectionInitialized = false;
    this.pendingIceCandidates = [];
    this.isProcessingOffer = false;
    this.isCreatingOffer = false;
    this.negotiationPending = false;
    this.videoAcceptHandled = false;
    this.onVideoInvite = undefined;
    this.onVideoEnded = undefined;
    this.onSessionEnded = undefined;
    this.onVideoAccepted = undefined;
    this.onVideoDeclined = undefined;
    this.onRemoteStream = undefined;
  }
}

/**
 * Singleton WebRTC manager instance
 */
export const webrtcManager = new WebRTCManager();
