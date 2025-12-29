/**
 * WebRTC Peer Connection
 *
 * RTCPeerConnection wrapper for browser WebRTC with Perfect Negotiation pattern.
 * Handles ICE candidate queueing, data channel management, and media track lifecycle.
 *
 * Extracted from session-view.tsx for modularity.
 */

import type {
  IceCandidateCallback,
  ConnectionStateChangeCallback,
  IceConnectionStateChangeCallback,
  DataChannelMessageCallback,
  RemoteStreamCallback,
  DataChannelMessage,
  DATA_CHANNEL_TIMEOUT_MS,
  DATA_CHANNEL_TIMEOUT_SLOW_NETWORK_MS,
} from './types';

// ============================================================================
// PeerConnection Class
// ============================================================================

export class PeerConnection {
  private pc: RTCPeerConnection | null = null;
  private dataChannel: RTCDataChannel | null = null;
  private iceCandidateQueue: RTCIceCandidate[] = [];
  private remoteDescriptionSet: boolean = false;
  private isPolite: boolean = false;
  private makingOffer: boolean = false;
  private ignoreOffer: boolean = false;
  private dataChannelTimeout: ReturnType<typeof setTimeout> | null = null;

  // Event callbacks
  private onIceCandidateCallback: IceCandidateCallback | null = null;
  private onTrackCallback: ((event: RTCTrackEvent) => void) | null = null;
  private onDataChannelCallback: ((channel: RTCDataChannel) => void) | null = null;
  private onConnectionStateChangeCallback: ConnectionStateChangeCallback | null = null;
  private onIceConnectionStateChangeCallback: IceConnectionStateChangeCallback | null = null;
  private onNegotiationNeededCallback: (() => void) | null = null;
  private onDataChannelOpenCallback: (() => void) | null = null;
  private onDataChannelMessageCallback: DataChannelMessageCallback | null = null;
  private onDataChannelTimeoutCallback: (() => void) | null = null;

  // ============================================================================
  // Initialization
  // ============================================================================

  /**
   * Initialize RTCPeerConnection with ICE configuration.
   *
   * @param config - RTCConfiguration with ICE servers
   * @param isPolite - Whether this peer is polite in Perfect Negotiation (guest = true, host = false)
   */
  initialize(config: RTCConfiguration, isPolite: boolean = false): void {
    if (this.pc) {
      console.warn('[PeerConnection] Already initialized');
      return;
    }

    this.isPolite = isPolite;
    this.pc = new RTCPeerConnection(config);

    this.setupEventHandlers();
    console.log('[PeerConnection] Initialized as', isPolite ? 'polite' : 'impolite');
  }

  /**
   * Setup RTCPeerConnection event handlers.
   */
  private setupEventHandlers(): void {
    if (!this.pc) return;

    // ICE candidate generation
    this.pc.onicecandidate = (event) => {
      if (event.candidate && this.onIceCandidateCallback) {
        this.onIceCandidateCallback(event.candidate);
      }
    };

    // Track received (remote media)
    this.pc.ontrack = (event) => {
      console.log('[PeerConnection] Remote track received:', event.track.kind);
      if (this.onTrackCallback) {
        this.onTrackCallback(event);
      }
    };

    // Data channel received (for non-initiator)
    this.pc.ondatachannel = (event) => {
      console.log('[PeerConnection] Data channel received');
      this.dataChannel = event.channel;
      this.setupDataChannel();
      if (this.onDataChannelCallback) {
        this.onDataChannelCallback(event.channel);
      }
    };

    // Connection state changes
    this.pc.onconnectionstatechange = () => {
      const state = this.pc!.connectionState;
      console.log('[PeerConnection] Connection state:', state);
      if (this.onConnectionStateChangeCallback) {
        this.onConnectionStateChangeCallback(state);
      }
    };

    // ICE connection state changes
    this.pc.oniceconnectionstatechange = () => {
      const state = this.pc!.iceConnectionState;
      console.log('[PeerConnection] ICE connection state:', state);
      if (this.onIceConnectionStateChangeCallback) {
        this.onIceConnectionStateChangeCallback(state);
      }
    };

    // Negotiation needed (for renegotiation)
    this.pc.onnegotiationneeded = () => {
      console.log('[PeerConnection] Negotiation needed');
      if (this.onNegotiationNeededCallback) {
        this.onNegotiationNeededCallback();
      }
    };
  }

  /**
   * Setup data channel event handlers.
   */
  private setupDataChannel(): void {
    if (!this.dataChannel) return;

    const channel = this.dataChannel;

    // Set timeout for data channel to open
    if (channel.readyState !== 'open') {
      const timeoutMs = this.getDataChannelTimeout();
      this.dataChannelTimeout = setTimeout(() => {
        if (channel.readyState !== 'open') {
          console.error('[PeerConnection] Data channel failed to open within timeout');
          if (this.onDataChannelTimeoutCallback) {
            this.onDataChannelTimeoutCallback();
          }
        }
      }, timeoutMs);
    }

    channel.onopen = () => {
      console.log('[PeerConnection] Data channel open');
      this.clearDataChannelTimeout();
      if (this.onDataChannelOpenCallback) {
        this.onDataChannelOpenCallback();
      }
    };

    channel.onclose = () => {
      console.log('[PeerConnection] Data channel closed');
    };

    channel.onerror = (error) => {
      console.error('[PeerConnection] Data channel error:', error);
    };

    channel.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data) as DataChannelMessage;
        if (this.onDataChannelMessageCallback) {
          this.onDataChannelMessageCallback(message);
        }
      } catch (error) {
        console.error('[PeerConnection] Failed to parse data channel message:', error);
      }
    };
  }

  /**
   * Get adaptive data channel timeout based on network quality.
   * Uses browser's Network Information API if available.
   */
  private getDataChannelTimeout(): number {
    if (typeof navigator === 'undefined') {
      return 10000; // 10s default
    }

    const connection = (navigator as any).connection;
    if (!connection) {
      return 10000;
    }

    // Fast network (4G/5G): 10s timeout
    if (connection.effectiveType === '4g') {
      return 10000;
    }

    // Slow network (2G/3G): 20s timeout
    return 20000;
  }

  /**
   * Clear data channel timeout.
   */
  private clearDataChannelTimeout(): void {
    if (this.dataChannelTimeout) {
      clearTimeout(this.dataChannelTimeout);
      this.dataChannelTimeout = null;
    }
  }

  // ============================================================================
  // Offer/Answer Creation
  // ============================================================================

  /**
   * Create WebRTC offer.
   * Sets local description automatically.
   */
  async createOffer(): Promise<RTCSessionDescriptionInit> {
    if (!this.pc) {
      throw new Error('Peer connection not initialized');
    }

    try {
      this.makingOffer = true;
      const offer = await this.pc.createOffer();
      await this.pc.setLocalDescription(offer);
      console.log('[PeerConnection] Local description set (offer)');
      return offer;
    } catch (error) {
      console.error('[PeerConnection] Failed to create offer:', error);
      throw error;
    } finally {
      this.makingOffer = false;
    }
  }

  /**
   * Create WebRTC answer.
   * Sets local description automatically.
   */
  async createAnswer(): Promise<RTCSessionDescriptionInit> {
    if (!this.pc) {
      throw new Error('Peer connection not initialized');
    }

    try {
      const answer = await this.pc.createAnswer();
      await this.pc.setLocalDescription(answer);
      console.log('[PeerConnection] Local description set (answer)');
      return answer;
    } catch (error) {
      console.error('[PeerConnection] Failed to create answer:', error);
      throw error;
    }
  }

  // ============================================================================
  // Session Description Management
  // ============================================================================

  /**
   * Set local description.
   * Called explicitly when you want control over timing.
   */
  async setLocalDescription(desc: RTCSessionDescriptionInit): Promise<void> {
    if (!this.pc) {
      throw new Error('Peer connection not initialized');
    }

    await this.pc.setLocalDescription(desc);
    console.log('[PeerConnection] Local description set:', desc.type);
  }

  /**
   * Set remote description.
   * Processes queued ICE candidates after setting.
   */
  async setRemoteDescription(desc: RTCSessionDescriptionInit): Promise<void> {
    if (!this.pc) {
      throw new Error('Peer connection not initialized');
    }

    try {
      console.log('[PeerConnection] Setting remote description:', desc.type);
      await this.pc.setRemoteDescription(new RTCSessionDescription(desc));
      this.remoteDescriptionSet = true;

      // Process queued ICE candidates
      await this.processQueuedCandidates();
    } catch (error) {
      console.error('[PeerConnection] Failed to set remote description:', error);
      throw error;
    }
  }

  // ============================================================================
  // ICE Candidate Management
  // ============================================================================

  /**
   * Add ICE candidate.
   * Queues candidate if remote description not yet set.
   */
  async addIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    if (!this.pc) {
      throw new Error('Peer connection not initialized');
    }

    // Queue if remote description not set yet
    if (!this.remoteDescriptionSet) {
      console.log('[PeerConnection] Queuing ICE candidate (no remote description yet)');
      this.iceCandidateQueue.push(new RTCIceCandidate(candidate));
      return;
    }

    try {
      await this.pc.addIceCandidate(new RTCIceCandidate(candidate));
      console.log('[PeerConnection] Added ICE candidate');
    } catch (error) {
      console.warn('[PeerConnection] Failed to add ICE candidate:', error);
      // Don't throw - ICE candidate errors are usually recoverable
    }
  }

  /**
   * Process all queued ICE candidates.
   * Called after remote description is set.
   */
  async processQueuedCandidates(): Promise<void> {
    if (this.iceCandidateQueue.length === 0) {
      return;
    }

    console.log('[PeerConnection] Processing', this.iceCandidateQueue.length, 'queued ICE candidates');

    const candidates = [...this.iceCandidateQueue];
    this.iceCandidateQueue = [];

    for (const candidate of candidates) {
      try {
        await this.pc!.addIceCandidate(candidate);
      } catch (error) {
        console.warn('[PeerConnection] Failed to add queued ICE candidate:', error);
      }
    }
  }

  // ============================================================================
  // Data Channel Management
  // ============================================================================

  /**
   * Create data channel (for initiator).
   */
  createDataChannel(label: string = 'chat'): RTCDataChannel {
    if (!this.pc) {
      throw new Error('Peer connection not initialized');
    }

    console.log('[PeerConnection] Creating data channel:', label);
    this.dataChannel = this.pc.createDataChannel(label, {
      ordered: true,
    });

    this.setupDataChannel();
    return this.dataChannel;
  }

  /**
   * Send message via data channel.
   */
  sendMessage(message: DataChannelMessage): void {
    if (!this.dataChannel || this.dataChannel.readyState !== 'open') {
      throw new Error('Data channel is not open');
    }

    try {
      const data = JSON.stringify(message);
      this.dataChannel.send(data);
      console.log('[PeerConnection] Sent data channel message:', message.type);
    } catch (error) {
      console.error('[PeerConnection] Failed to send message:', error);
      throw error;
    }
  }

  // ============================================================================
  // Media Track Management
  // ============================================================================

  /**
   * Add media track to peer connection.
   */
  addTrack(track: MediaStreamTrack, stream: MediaStream): RTCRtpSender {
    if (!this.pc) {
      throw new Error('Peer connection not initialized');
    }

    console.log('[PeerConnection] Adding track:', track.kind);
    return this.pc.addTrack(track, stream);
  }

  /**
   * Remove media track from peer connection.
   */
  removeTrack(sender: RTCRtpSender): void {
    if (!this.pc) {
      throw new Error('Peer connection not initialized');
    }

    console.log('[PeerConnection] Removing track');
    this.pc.removeTrack(sender);
  }

  // ============================================================================
  // ICE Restart
  // ============================================================================

  /**
   * Request ICE restart.
   * Useful for recovering from network changes.
   */
  restartIce(): void {
    if (!this.pc) {
      throw new Error('Peer connection not initialized');
    }

    if (typeof this.pc.restartIce === 'function') {
      console.log('[PeerConnection] Requesting ICE restart');
      this.pc.restartIce();
    } else {
      console.warn('[PeerConnection] ICE restart not supported');
    }
  }

  // ============================================================================
  // Event Handlers
  // ============================================================================

  setOnIceCandidate(callback: IceCandidateCallback): void {
    this.onIceCandidateCallback = callback;
  }

  setOnTrack(callback: (event: RTCTrackEvent) => void): void {
    this.onTrackCallback = callback;
  }

  setOnDataChannel(callback: (channel: RTCDataChannel) => void): void {
    this.onDataChannelCallback = callback;
  }

  setOnConnectionStateChange(callback: ConnectionStateChangeCallback): void {
    this.onConnectionStateChangeCallback = callback;
  }

  setOnIceConnectionStateChange(callback: IceConnectionStateChangeCallback): void {
    this.onIceConnectionStateChangeCallback = callback;
  }

  setOnNegotiationNeeded(callback: () => void): void {
    this.onNegotiationNeededCallback = callback;
  }

  setOnDataChannelOpen(callback: () => void): void {
    this.onDataChannelOpenCallback = callback;
  }

  setOnDataChannelMessage(callback: DataChannelMessageCallback): void {
    this.onDataChannelMessageCallback = callback;
  }

  setOnDataChannelTimeout(callback: () => void): void {
    this.onDataChannelTimeoutCallback = callback;
  }

  // ============================================================================
  // Getters
  // ============================================================================

  getSignalingState(): RTCSignalingState | null {
    return this.pc?.signalingState ?? null;
  }

  getConnectionState(): RTCPeerConnectionState | null {
    return this.pc?.connectionState ?? null;
  }

  getIceConnectionState(): RTCIceConnectionState | null {
    return this.pc?.iceConnectionState ?? null;
  }

  getDataChannelState(): RTCDataChannelState | null {
    return this.dataChannel?.readyState ?? null;
  }

  // ============================================================================
  // Cleanup
  // ============================================================================

  /**
   * Close peer connection and cleanup resources.
   */
  close(): void {
    console.log('[PeerConnection] Closing');

    this.clearDataChannelTimeout();

    if (this.dataChannel) {
      this.dataChannel.close();
      this.dataChannel = null;
    }

    if (this.pc) {
      this.pc.close();
      this.pc = null;
    }

    this.iceCandidateQueue = [];
    this.remoteDescriptionSet = false;
    this.isPolite = false;
    this.makingOffer = false;
    this.ignoreOffer = false;

    // Clear callbacks
    this.onIceCandidateCallback = null;
    this.onTrackCallback = null;
    this.onDataChannelCallback = null;
    this.onConnectionStateChangeCallback = null;
    this.onIceConnectionStateChangeCallback = null;
    this.onNegotiationNeededCallback = null;
    this.onDataChannelOpenCallback = null;
    this.onDataChannelMessageCallback = null;
    this.onDataChannelTimeoutCallback = null;
  }
}
