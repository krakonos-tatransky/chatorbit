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
  private isInitiator = false;
  private token: string | null = null;
  private participantId: string | null = null;
  private videoStarted = false;
  private signalingInitialized = false;
  private pendingIceCandidates: RTCIceCandidateInit[] = [];
  private isProcessingOffer = false;

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
    // Guard against multiple initializations
    if (this.signalingInitialized && this.signaling.isConnected()) {
      console.log('[WebRTC] Signaling already initialized, skipping');
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
   * Start video/audio capture and initialize peer connection
   * Called when user taps camera button or accepts video invite
   */
  async startVideo(
    config?: WebRTCConfig,
    mediaConstraints?: MediaConstraints
  ): Promise<MediaStream> {
    if (this.videoStarted) {
      console.log('[WebRTC] Video already started');
      return this.peerConnection!.getLocalStream()!;
    }

    try {
      console.log('[WebRTC] Starting video');

      // Initialize peer connection
      this.peerConnection = new PeerConnection();
      await this.peerConnection.initialize(config);

      // Setup ICE candidate handler with queuing
      this.peerConnection.onIceCandidate((candidate) => {
        this.sendIceCandidate(candidate.toJSON());
      });

      // Setup remote stream handler
      this.peerConnection.onRemoteStream((stream) => {
        console.log('[WebRTC] Remote stream received');
      });

      // Setup data channel handlers
      this.setupDataChannelHandlers();

      // Add local media stream
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
   * Send video invite to remote peer
   */
  sendVideoInvite(): void {
    console.log('[WebRTC] Sending video invite');
    this.signaling.send({
      type: 'signal',
      signalType: 'video-invite',
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
   * Accept video invite and start WebRTC negotiation
   */
  async acceptVideoInvite(): Promise<void> {
    console.log('[WebRTC] Accepting video invite');

    // Send accept message
    this.signaling.send({
      type: 'signal',
      signalType: 'video-accept',
      payload: {},
    });

    // Create data channel and offer
    if (this.peerConnection) {
      this.peerConnection.createDataChannel('chat');
      const offer = await this.peerConnection.createOffer();
      this.signaling.send({
        type: 'signal',
        signalType: 'offer',
        payload: { sdp: offer.sdp },
      });
    }
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

      // Setup remote stream handler
      this.peerConnection.onRemoteStream((stream) => {
        console.log('[WebRTC] Remote stream received');
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

    // Close peer connection video only (keeps connection state)
    if (this.peerConnection) {
      this.peerConnection.closeVideoOnly();
      this.peerConnection = null;
    }

    // Reset video state but keep signaling connected
    this.videoStarted = false;
    this.pendingIceCandidates = [];
    this.isProcessingOffer = false;

    // Notify UI
    if (this.onVideoEnded) {
      this.onVideoEnded();
    }
  }

  /**
   * Handle video accept from remote peer
   *
   * NOTE: We do NOT create an offer here. The peer who ACCEPTS the invite
   * (via acceptVideoInvite) is responsible for creating the offer.
   * This handler just acknowledges that the remote peer accepted.
   */
  private async handleVideoAccept(): Promise<void> {
    console.log('[WebRTC] Remote peer accepted video - waiting for their offer');
    // The accepting peer will send us an offer, we just wait for it.
    // Our handleOffer will process it when it arrives.
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
      console.log('[WebRTC] Session is active with 2 participants - connected');
      connectionStore.setConnectionState('connected');
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

      default:
        console.log('[WebRTC] Unknown signal type:', signalType);
    }
  }

  /**
   * Setup data channel message handlers
   */
  private setupDataChannelHandlers(): void {
    if (!this.peerConnection) return;

    this.peerConnection.onDataChannelMessage(async (message: DataChannelMessage) => {
      try {
        switch (message.type) {
          case 'message':
            // Decrypt and add to messages store
            if (this.token) {
              await decryptAndAddMessage(
                this.token,
                message.payload,
                message.messageId,
                message.timestamp
              );
            }
            break;

          case 'ack':
            // Mark message as sent
            useMessagesStore.getState().markMessageSent(message.messageId);
            break;

          case 'typing':
            // Handle typing indicator (future enhancement)
            break;
        }
      } catch (error) {
        console.error('[WebRTC] Failed to handle data channel message:', error);
      }
    });
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
      console.log('[WebRTC] Received offer but no peer connection - initializing');
      // Initialize peer connection on-demand for guest
      this.peerConnection = new PeerConnection();
      await this.peerConnection.initialize();

      // Setup ICE candidate handler with queuing
      this.peerConnection.onIceCandidate((candidate) => {
        this.sendIceCandidate(candidate.toJSON());
      });

      // Setup remote stream handler
      this.peerConnection.onRemoteStream((stream) => {
        console.log('[WebRTC] Remote stream received');
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
        payload: { sdp: answer.sdp },
      });

      // Flush any pending ICE candidates now that signaling is stable
      this.flushPendingIceCandidates();
    } finally {
      this.isProcessingOffer = false;
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
   * Send encrypted message
   */
  async sendMessage(content: string): Promise<void> {
    if (!this.token) {
      throw new WebRTCError(
        WebRTCErrorCode.INVALID_STATE,
        'No active session'
      );
    }

    try {
      // Encrypt message
      const encrypted = await useMessagesStore.getState().sendMessage(this.token, content);

      // If we have a data channel open, use it
      if (this.peerConnection) {
        try {
          const message: DataChannelMessage = {
            type: 'message',
            payload: encrypted.payload,
            messageId: encrypted.messageId,
            timestamp: encrypted.timestamp,
          };

          this.peerConnection.sendMessage(message);
          console.log('[WebRTC] Message sent via data channel');
          return;
        } catch (error) {
          console.log('[WebRTC] Data channel failed, falling back to signaling');
        }
      }

      // Fallback to signaling - backend expects type: "signal" with signalType
      this.signaling.send({
        type: 'signal',
        signalType: 'message',
        payload: {
          payload: encrypted.payload,
          messageId: encrypted.messageId,
          timestamp: encrypted.timestamp,
        },
      });
      console.log('[WebRTC] Message sent via signaling');

      // Mark message as sent (no ack from signaling, so mark immediately)
      useMessagesStore.getState().markMessageSent(encrypted.messageId);
    } catch (error) {
      console.error('[WebRTC] Failed to send message:', error);
      throw error;
    }
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
   * Stop video chat while keeping text chat connected.
   * Closes peer connection but keeps signaling open.
   * Notifies remote peer so they also stop video.
   */
  stopVideo(): void {
    console.log('[WebRTC] Stopping video (keeping text chat)');

    // Notify remote peer that video is ending
    if (this.signaling.isConnected()) {
      this.signaling.send({
        type: 'signal',
        signalType: 'video-end',
        payload: {},
      });
    }

    // Close peer connection video only (keeps connection state)
    if (this.peerConnection) {
      this.peerConnection.closeVideoOnly();
      this.peerConnection = null;
    }

    // Reset video state but keep signaling connected
    this.videoStarted = false;
    this.pendingIceCandidates = [];
    this.isProcessingOffer = false;
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
    this.videoStarted = false;
    this.signalingInitialized = false;
    this.pendingIceCandidates = [];
    this.isProcessingOffer = false;
    this.onVideoInvite = undefined;
    this.onVideoEnded = undefined;
    this.onSessionEnded = undefined;
  }
}

/**
 * Singleton WebRTC manager instance
 */
export const webrtcManager = new WebRTCManager();
