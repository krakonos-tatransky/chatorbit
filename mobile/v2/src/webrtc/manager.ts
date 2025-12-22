/**
 * WebRTC Manager
 *
 * High-level WebRTC orchestration that combines signaling and peer connection.
 * Supports chat-first flow: signaling for text, then optional video via invite.
 */

import { MediaStream } from 'react-native-webrtc';
import { SignalingClient, signalingClient } from './signaling';
import { PeerConnection } from './connection';
import { useMessagesStore, useSessionStore, decryptAndAddMessage } from '@/state';
import type {
  SignalingMessage,
  MediaConstraints,
  WebRTCConfig,
  DataChannelMessage,
} from './types';
import { WebRTCError, WebRTCErrorCode } from './types';

/**
 * Video invite callback type
 */
export type VideoInviteCallback = () => void;

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

  /**
   * Callback when remote peer sends video invite
   */
  public onVideoInvite?: VideoInviteCallback;

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
    try {
      console.log('[WebRTC] Initializing signaling as', isHost ? 'host' : 'guest');

      this.token = token;
      this.participantId = participantId;
      this.isInitiator = isHost;

      // Connect to signaling server
      await this.signaling.connect(token, participantId);

      // Setup signaling handlers for text messages and video invites
      this.setupSignalingHandlers();

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

      // Setup ICE candidate handler
      this.peerConnection.onIceCandidate((candidate) => {
        this.signaling.send({
          type: 'ice-candidate',
          candidate: candidate.toJSON(),
        });
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
      type: 'video-invite',
    });
  }

  /**
   * Accept video invite and start WebRTC negotiation
   */
  async acceptVideoInvite(): Promise<void> {
    console.log('[WebRTC] Accepting video invite');

    // Send accept message
    this.signaling.send({
      type: 'video-accept',
    });

    // Create data channel and offer
    if (this.peerConnection) {
      this.peerConnection.createDataChannel('chat');
      const offer = await this.peerConnection.createOffer();
      this.signaling.send({
        type: 'offer',
        offer,
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
   * Handle video accept from remote peer
   */
  private async handleVideoAccept(): Promise<void> {
    console.log('[WebRTC] Remote peer accepted video');

    // Now we create the data channel and offer since they accepted
    if (this.peerConnection) {
      this.peerConnection.createDataChannel('chat');
      const offer = await this.peerConnection.createOffer();
      this.signaling.send({
        type: 'offer',
        offer,
      });
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
    if (!this.peerConnection) {
      console.log('[WebRTC] Received offer but no peer connection - initializing');
      // Initialize peer connection on-demand for guest
      this.peerConnection = new PeerConnection();
      await this.peerConnection.initialize();

      // Setup ICE candidate handler
      this.peerConnection.onIceCandidate((candidate) => {
        this.signaling.send({
          type: 'ice-candidate',
          candidate: candidate.toJSON(),
        });
      });

      // Setup remote stream handler
      this.peerConnection.onRemoteStream((stream) => {
        console.log('[WebRTC] Remote stream received');
      });

      // Setup data channel handlers
      this.setupDataChannelHandlers();
    }

    console.log('[WebRTC] Received offer');
    await this.peerConnection.setRemoteDescription(offer);

    // Create and send answer
    const answer = await this.peerConnection.createAnswer();
    this.signaling.send({
      type: 'answer',
      answer,
    });
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

    console.log('[WebRTC] Received answer');
    await this.peerConnection.setRemoteDescription(answer);
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
   * Handle session ended
   */
  private async handleSessionEnded(reason?: string): Promise<void> {
    console.log('[WebRTC] Session ended:', reason);
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

      // Fallback to signaling
      this.signaling.send({
        type: 'message',
        payload: encrypted.payload,
        messageId: encrypted.messageId,
        timestamp: encrypted.timestamp,
      });
      console.log('[WebRTC] Message sent via signaling');
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

    // Clear session data
    this.token = null;
    this.participantId = null;
    this.isInitiator = false;
    this.videoStarted = false;
    this.onVideoInvite = undefined;
  }
}

/**
 * Singleton WebRTC manager instance
 */
export const webrtcManager = new WebRTCManager();
