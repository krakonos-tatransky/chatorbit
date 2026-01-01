/**
 * Peer Connection
 *
 * Manages RTCPeerConnection for video/audio streaming and data channel
 * for encrypted text messages.
 */

import {
  RTCPeerConnection,
  RTCIceCandidate,
  RTCSessionDescription,
  MediaStream,
  mediaDevices,
} from 'react-native-webrtc';
import { useConnectionStore } from '@/state';
import { API_CONFIG } from '@/utils/env';
import type {
  WebRTCConfig,
  MediaConstraints,
  DataChannelMessage,
} from './types';
import { DEFAULT_MEDIA_CONSTRAINTS } from './types';
import { WebRTCError, WebRTCErrorCode } from './types';

/**
 * Data channel message handler
 */
export type DataChannelMessageHandler = (message: DataChannelMessage) => void;

/**
 * Media stream handler
 */
export type MediaStreamHandler = (stream: MediaStream) => void;

/**
 * ICE candidate handler
 */
export type IceCandidateHandler = (candidate: RTCIceCandidate) => void;

/**
 * Peer connection manager
 */
export class PeerConnection {
  private pc: RTCPeerConnection | null = null;
  private dataChannel: RTCDataChannel | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private dataChannelHandlers: Set<DataChannelMessageHandler> = new Set();
  private dataChannelOpenHandlers: Set<() => void> = new Set();
  private remoteStreamHandlers: Set<MediaStreamHandler> = new Set();
  private iceCandidateHandlers: Set<IceCandidateHandler> = new Set();
  private pendingIceCandidates: RTCIceCandidate[] = [];
  private negotiationCallback?: () => Promise<void>;
  private iceConnectionFailedCallback?: () => void;
  private dataChannelTimeoutRef: ReturnType<typeof setTimeout> | null = null;

  /**
   * Initialize peer connection
   */
  async initialize(config?: WebRTCConfig): Promise<void> {
    try {
      // Build ICE servers configuration
      const iceServers: RTCIceServer[] = config?.iceServers || this.getDefaultIceServers();

      console.log('[PeerConnection] Initializing with ICE servers:', iceServers);

      // Create peer connection
      this.pc = new RTCPeerConnection({
        iceServers,
        iceCandidatePoolSize: 10,
      });

      // Setup event handlers
      this.setupEventHandlers();

      useConnectionStore.getState().setPeerConnectionState('new');
      console.log('[PeerConnection] Initialized');
    } catch (error) {
      console.error('[PeerConnection] Initialization failed:', error);
      throw new WebRTCError(
        WebRTCErrorCode.PEER_CONNECTION_FAILED,
        'Failed to initialize peer connection',
        error as Error
      );
    }
  }

  /**
   * Get default ICE servers from environment
   */
  private getDefaultIceServers(): RTCIceServer[] {
    const stunUrls = process.env.EXPO_PUBLIC_WEBRTC_STUN_URLS?.split(',') || [
      'stun:stun.l.google.com:19302',
    ];
    const turnUrls = process.env.EXPO_PUBLIC_WEBRTC_TURN_URLS?.split(',') || [];
    const turnUser = process.env.EXPO_PUBLIC_WEBRTC_TURN_USER;
    const turnPassword = process.env.EXPO_PUBLIC_WEBRTC_TURN_PASSWORD;

    const iceServers: RTCIceServer[] = [
      { urls: stunUrls },
    ];

    if (turnUrls.length > 0 && turnUser && turnPassword) {
      iceServers.push({
        urls: turnUrls,
        username: turnUser,
        credential: turnPassword,
      });
    }

    return iceServers;
  }

  /**
   * Setup peer connection event handlers
   */
  private setupEventHandlers(): void {
    if (!this.pc) return;

    const pc = this.pc as any; // Cast to any to access addEventListener

    // ICE candidate
    pc.addEventListener('icecandidate', (event: any) => {
      if (event.candidate) {
        console.log('[PeerConnection] ICE candidate generated');
        this.iceCandidateHandlers.forEach((handler) => {
          try {
            handler(event.candidate);
          } catch (error) {
            console.error('[PeerConnection] ICE candidate handler error:', error);
          }
        });
      }
    });

    // ICE connection state
    pc.addEventListener('iceconnectionstatechange', () => {
      const state = this.pc?.iceConnectionState;
      console.log('[PeerConnection] ICE connection state:', state);
      if (state) {
        useConnectionStore.getState().setIceConnectionState(state as any);

        // Recommendation #5: Improve error recovery parity with browser
        if (state === 'failed') {
          console.log('[PeerConnection] ICE connection failed - triggering recovery callback');
          if (this.iceConnectionFailedCallback) {
            this.iceConnectionFailedCallback();
          }
        }
      }
    });

    // Connection state
    pc.addEventListener('connectionstatechange', () => {
      const state = this.pc?.connectionState;
      console.log('[PeerConnection] Connection state:', state);
      if (state) {
        useConnectionStore.getState().setPeerConnectionState(state as any);
      }
    });

    // Remote stream
    pc.addEventListener('track', (event: any) => {
      console.log('[PeerConnection] Remote track received:', event.track.kind);
      console.log('[PeerConnection] Track event streams:', event.streams?.length, event.streams);

      // For reinvite scenarios: always create fresh stream from the event
      // This ensures we don't accumulate old ended tracks
      let stream = event.streams?.[0];

      if (!stream) {
        // No stream in event, create new one with just this track
        stream = new MediaStream();
        stream.addTrack(event.track);
        console.log('[PeerConnection] Created new MediaStream with track:', event.track.kind);
      } else {
        console.log('[PeerConnection] Using stream from event, tracks:',
          stream.getTracks().map((t: any) => `${t.kind}:${t.readyState}`).join(', '));
      }

      this.remoteStream = stream;
      this.remoteStreamHandlers.forEach((handler) => {
        try {
          handler(stream);
        } catch (error) {
          console.error('[PeerConnection] Remote stream handler error:', error);
        }
      });

      // Update media state
      const hasVideo = stream.getVideoTracks().length > 0;
      const hasAudio = stream.getAudioTracks().length > 0;
      useConnectionStore.getState().setRemoteMedia(hasVideo, hasAudio);
    });

    // Data channel (when received)
    pc.addEventListener('datachannel', (event: any) => {
      console.log('[PeerConnection] Data channel received');
      this.dataChannel = event.channel;
      this.setupDataChannel();
    });

    // Recommendation #1: Align renegotiation strategy with browser
    pc.addEventListener('negotiationneeded', async () => {
      console.log('[PeerConnection] Negotiation needed');
      if (this.negotiationCallback) {
        try {
          await this.negotiationCallback();
        } catch (error) {
          console.error('[PeerConnection] Negotiation callback error:', error);
        }
      }
    });
  }

  /**
   * Setup data channel event handlers
   */
  private setupDataChannel(): void {
    if (!this.dataChannel) return;

    // Recommendation #3: Add DataChannel timeout (15 seconds)
    if (this.dataChannel.readyState !== 'open') {
      this.dataChannelTimeoutRef = setTimeout(() => {
        if (this.dataChannel?.readyState !== 'open') {
          console.error('[PeerConnection] DataChannel failed to open within timeout');
          // Trigger ICE recovery callback
          if (this.iceConnectionFailedCallback) {
            this.iceConnectionFailedCallback();
          }
        }
      }, 15000); // 15 seconds
    }

    this.dataChannel.onopen = () => {
      console.log('[PeerConnection] Data channel open');

      // Clear timeout
      if (this.dataChannelTimeoutRef) {
        clearTimeout(this.dataChannelTimeoutRef);
        this.dataChannelTimeoutRef = null;
      }

      // Notify handlers that data channel is ready for text chat
      this.dataChannelOpenHandlers.forEach((handler) => {
        try {
          handler();
        } catch (error) {
          console.error('[PeerConnection] Data channel open handler error:', error);
        }
      });
    };

    this.dataChannel.onclose = () => {
      console.log('[PeerConnection] Data channel closed');
    };

    this.dataChannel.onerror = (error) => {
      console.error('[PeerConnection] Data channel error:', error);
    };

    this.dataChannel.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data) as DataChannelMessage;
        console.log('[PeerConnection] Data channel message:', message.type);

        this.dataChannelHandlers.forEach((handler) => {
          try {
            handler(message);
          } catch (error) {
            console.error('[PeerConnection] Data channel handler error:', error);
          }
        });
      } catch (error) {
        console.error('[PeerConnection] Failed to parse data channel message:', error);
      }
    };
  }

  /**
   * Create data channel (for initiator)
   */
  createDataChannel(label: string = 'chat'): void {
    if (!this.pc) {
      throw new WebRTCError(
        WebRTCErrorCode.INVALID_STATE,
        'Peer connection not initialized'
      );
    }

    console.log('[PeerConnection] Creating data channel:', label);
    this.dataChannel = this.pc.createDataChannel(label, {
      ordered: true,
    }) as any;

    this.setupDataChannel();
  }

  /**
   * Add local media stream
   */
  async addLocalStream(constraints?: MediaConstraints): Promise<MediaStream> {
    if (!this.pc) {
      throw new WebRTCError(
        WebRTCErrorCode.INVALID_STATE,
        'Peer connection not initialized'
      );
    }

    try {
      console.log('[PeerConnection] Requesting local media stream');
      const stream = await mediaDevices.getUserMedia(
        constraints || (DEFAULT_MEDIA_CONSTRAINTS as any)
      );

      this.localStream = stream;

      // Add tracks to peer connection
      stream.getTracks().forEach((track) => {
        console.log('[PeerConnection] Adding local track:', track.kind);
        this.pc!.addTrack(track, stream);
      });

      // Update media state
      const hasVideo = stream.getVideoTracks().length > 0;
      const hasAudio = stream.getAudioTracks().length > 0;
      useConnectionStore.getState().setLocalMedia(hasVideo, hasAudio);

      return stream;
    } catch (error) {
      console.error('[PeerConnection] Failed to get user media:', error);
      throw new WebRTCError(
        WebRTCErrorCode.MEDIA_PERMISSION_DENIED,
        'Failed to access camera/microphone',
        error as Error
      );
    }
  }

  /**
   * Create offer
   */
  async createOffer(): Promise<RTCSessionDescriptionInit> {
    if (!this.pc) {
      throw new WebRTCError(
        WebRTCErrorCode.INVALID_STATE,
        'Peer connection not initialized'
      );
    }

    try {
      console.log('[PeerConnection] Creating offer');
      const offer = await this.pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
      });

      await this.pc.setLocalDescription(offer);
      console.log('[PeerConnection] Local description set (offer)');

      return offer;
    } catch (error) {
      console.error('[PeerConnection] Failed to create offer:', error);
      throw new WebRTCError(
        WebRTCErrorCode.PEER_CONNECTION_FAILED,
        'Failed to create offer',
        error as Error
      );
    }
  }

  /**
   * Create answer
   */
  async createAnswer(): Promise<RTCSessionDescriptionInit> {
    if (!this.pc) {
      throw new WebRTCError(
        WebRTCErrorCode.INVALID_STATE,
        'Peer connection not initialized'
      );
    }

    try {
      console.log('[PeerConnection] Creating answer');
      const answer = await this.pc.createAnswer();

      await this.pc.setLocalDescription(answer);
      console.log('[PeerConnection] Local description set (answer)');

      return answer;
    } catch (error) {
      console.error('[PeerConnection] Failed to create answer:', error);
      throw new WebRTCError(
        WebRTCErrorCode.PEER_CONNECTION_FAILED,
        'Failed to create answer',
        error as Error
      );
    }
  }

  /**
   * Set remote description
   */
  async setRemoteDescription(description: RTCSessionDescriptionInit): Promise<void> {
    if (!this.pc) {
      throw new WebRTCError(
        WebRTCErrorCode.INVALID_STATE,
        'Peer connection not initialized'
      );
    }

    try {
      console.log('[PeerConnection] Setting remote description:', description.type);

      // Ensure sdp is defined
      if (!description.sdp) {
        throw new Error('Session description SDP is undefined');
      }

      await this.pc.setRemoteDescription(
        new RTCSessionDescription({
          type: description.type!,
          sdp: description.sdp,
        })
      );

      // Add any pending ICE candidates
      if (this.pendingIceCandidates.length > 0) {
        console.log(
          `[PeerConnection] Adding ${this.pendingIceCandidates.length} pending ICE candidates`
        );
        for (const candidate of this.pendingIceCandidates) {
          await this.addIceCandidate(candidate);
        }
        this.pendingIceCandidates = [];
      }
    } catch (error) {
      console.error('[PeerConnection] Failed to set remote description:', error);
      throw new WebRTCError(
        WebRTCErrorCode.PEER_CONNECTION_FAILED,
        'Failed to set remote description',
        error as Error
      );
    }
  }

  /**
   * Add ICE candidate
   */
  async addIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    if (!this.pc) {
      throw new WebRTCError(
        WebRTCErrorCode.INVALID_STATE,
        'Peer connection not initialized'
      );
    }

    try {
      // If remote description not set yet, queue the candidate
      if (!this.pc.remoteDescription) {
        console.log('[PeerConnection] Queuing ICE candidate (no remote description yet)');
        this.pendingIceCandidates.push(candidate as RTCIceCandidate);
        return;
      }

      console.log('[PeerConnection] Adding ICE candidate');
      await this.pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (error) {
      console.error('[PeerConnection] Failed to add ICE candidate:', error);
      // Don't throw - ICE candidate errors are usually recoverable
    }
  }

  /**
   * Send message via data channel
   */
  sendMessage(message: DataChannelMessage): void {
    if (!this.dataChannel || this.dataChannel.readyState !== 'open') {
      throw new WebRTCError(
        WebRTCErrorCode.DATA_CHANNEL_ERROR,
        'Data channel is not open'
      );
    }

    try {
      const data = JSON.stringify(message);
      this.dataChannel.send(data);
      console.log('[PeerConnection] Sent data channel message:', message.type);
    } catch (error) {
      console.error('[PeerConnection] Failed to send message:', error);
      throw new WebRTCError(
        WebRTCErrorCode.SEND_MESSAGE_FAILED,
        'Failed to send message via data channel',
        error as Error
      );
    }
  }

  /**
   * Send raw message via data channel (for browser-compatible protocols like "call")
   */
  sendRawMessage(message: Record<string, unknown>): void {
    if (!this.dataChannel || this.dataChannel.readyState !== 'open') {
      throw new WebRTCError(
        WebRTCErrorCode.DATA_CHANNEL_ERROR,
        'Data channel is not open'
      );
    }

    try {
      const data = JSON.stringify(message);
      this.dataChannel.send(data);
      console.log('[PeerConnection] Sent raw data channel message:', message.type);
    } catch (error) {
      console.error('[PeerConnection] Failed to send raw message:', error);
      throw new WebRTCError(
        WebRTCErrorCode.SEND_MESSAGE_FAILED,
        'Failed to send message via data channel',
        error as Error
      );
    }
  }

  /**
   * Register data channel message handler
   */
  onDataChannelMessage(handler: DataChannelMessageHandler): () => void {
    this.dataChannelHandlers.add(handler);
    return () => {
      this.dataChannelHandlers.delete(handler);
    };
  }

  /**
   * Register data channel open handler (called when data channel is ready for text chat)
   */
  onDataChannelOpen(handler: () => void): () => void {
    this.dataChannelOpenHandlers.add(handler);
    return () => {
      this.dataChannelOpenHandlers.delete(handler);
    };
  }

  /**
   * Register remote stream handler
   */
  onRemoteStream(handler: MediaStreamHandler): () => void {
    this.remoteStreamHandlers.add(handler);
    return () => {
      this.remoteStreamHandlers.delete(handler);
    };
  }

  /**
   * Register ICE candidate handler
   */
  onIceCandidate(handler: IceCandidateHandler): () => void {
    this.iceCandidateHandlers.add(handler);
    return () => {
      this.iceCandidateHandlers.delete(handler);
    };
  }

  /**
   * Register negotiation needed callback (Recommendation #1)
   */
  onNegotiationNeeded(callback: () => Promise<void>): void {
    this.negotiationCallback = callback;
  }

  /**
   * Register ICE connection failed callback (Recommendation #5)
   */
  onIceConnectionFailed(callback: () => void): void {
    this.iceConnectionFailedCallback = callback;
  }

  /**
   * Get local stream
   */
  getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  /**
   * Get remote stream
   */
  getRemoteStream(): MediaStream | null {
    return this.remoteStream;
  }

  /**
   * Get signaling state
   */
  getSignalingState(): RTCSignalingState | null {
    return this.pc?.signalingState || null;
  }

  /**
   * Rollback local description (for handling offer collisions)
   * Used when we have a local offer but receive a remote offer
   */
  async rollback(): Promise<void> {
    if (!this.pc) {
      console.log('[PeerConnection] No peer connection for rollback');
      return;
    }

    const signalingState = this.pc.signalingState;
    if (signalingState !== 'have-local-offer') {
      console.log(`[PeerConnection] Rollback not needed in state: ${signalingState}`);
      return;
    }

    try {
      console.log('[PeerConnection] Rolling back local description');
      // Use RTCSessionDescription for react-native-webrtc compatibility
      const rollbackDesc = new RTCSessionDescription({
        type: 'rollback',
        sdp: '',
      });
      await this.pc.setLocalDescription(rollbackDesc);
      console.log('[PeerConnection] Rollback successful');
    } catch (error) {
      console.warn('[PeerConnection] Rollback failed, will try to continue:', error);
      // Don't throw - some platforms may not support rollback
      // The offer processing will attempt to continue anyway
    }
  }

  /**
   * Toggle local audio
   */
  toggleAudio(enabled: boolean): void {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach((track) => {
        track.enabled = enabled;
      });
      console.log('[PeerConnection] Audio:', enabled ? 'enabled' : 'disabled');
    }
  }

  /**
   * Toggle local video
   */
  toggleVideo(enabled: boolean): void {
    if (this.localStream) {
      this.localStream.getVideoTracks().forEach((track) => {
        track.enabled = enabled;
      });
      console.log('[PeerConnection] Video:', enabled ? 'enabled' : 'disabled');
    }
  }

  /**
   * Stop video/audio tracks only (keep data channel open for text chat)
   * Used when stopping video call but keeping text chat active
   */
  stopVideoTracks(): void {
    console.log('[PeerConnection] Stopping video tracks only (keeping data channel)');

    // Stop and remove local video/audio tracks from peer connection
    if (this.localStream && this.pc) {
      this.localStream.getTracks().forEach((track) => {
        track.stop();
        // Remove track from peer connection
        const senders = (this.pc as any).getSenders?.();
        if (senders) {
          senders.forEach((sender: any) => {
            if (sender.track === track) {
              (this.pc as any).removeTrack?.(sender);
            }
          });
        }
      });
      this.localStream = null;
    }

    // Reset media state only (NOT connection state or data channel)
    useConnectionStore.getState().setLocalMedia(false, false);
    useConnectionStore.getState().setRemoteMedia(false, false);
  }

  /**
   * Clear remote stream (used when remote peer ends video)
   * This prevents frozen video frames from being displayed
   */
  clearRemoteStream(): void {
    console.log('[PeerConnection] Clearing remote stream');
    if (this.remoteStream) {
      // Stop all remote tracks
      this.remoteStream.getTracks().forEach((track) => {
        track.stop();
      });
      this.remoteStream = null;
    }
    useConnectionStore.getState().setRemoteMedia(false, false);
  }

  /**
   * Close video/audio only (keep signaling connected)
   * Used when stopping video call but keeping text chat active
   */
  closeVideoOnly(): void {
    console.log('[PeerConnection] Closing video only (keeping connection state)');

    // Close data channel
    if (this.dataChannel) {
      this.dataChannel.close();
      this.dataChannel = null;
    }

    // Stop local stream
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
    }

    // Close peer connection
    if (this.pc) {
      this.pc.close();
      this.pc = null;
    }

    // Clear handlers
    this.dataChannelHandlers.clear();
    this.remoteStreamHandlers.clear();
    this.iceCandidateHandlers.clear();
    this.pendingIceCandidates = [];

    // Reset media state only (NOT connection state)
    useConnectionStore.getState().setLocalMedia(false, false);
    useConnectionStore.getState().setRemoteMedia(false, false);
    useConnectionStore.getState().setPeerConnectionState('closed');
    useConnectionStore.getState().setIceConnectionState('closed');
  }

  /**
   * Close connection and cleanup
   */
  close(): void {
    console.log('[PeerConnection] Closing');

    // Clear data channel timeout
    if (this.dataChannelTimeoutRef) {
      clearTimeout(this.dataChannelTimeoutRef);
      this.dataChannelTimeoutRef = null;
    }

    // Close data channel
    if (this.dataChannel) {
      this.dataChannel.close();
      this.dataChannel = null;
    }

    // Stop local stream
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
    }

    // Close peer connection
    if (this.pc) {
      this.pc.close();
      this.pc = null;
    }

    // Clear handlers
    this.dataChannelHandlers.clear();
    this.remoteStreamHandlers.clear();
    this.iceCandidateHandlers.clear();
    this.pendingIceCandidates = [];

    // Reset state
    useConnectionStore.getState().resetConnection();
  }
}
