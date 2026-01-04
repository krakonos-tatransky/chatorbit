import WebSocket from 'ws';
import * as crypto from 'crypto';
import { TestLogger } from '../utils/logger';
import { getIceServersFromEnv } from '../utils/webrtc-config';

// Import wrtc for Node.js WebRTC support
let wrtc: any;
try {
  wrtc = require('wrtc');
} catch (e) {
  console.warn('wrtc module not found. Install with: npm install wrtc');
}

export interface MobileSimulatorOptions {
  role?: 'host' | 'guest';
  deviceName?: string;
  autoConnect?: boolean;
}

export interface WebRTCState {
  connectionState: string;
  iceConnectionState: string;
  signalingState: string;
  dataChannelState: string | null;
  hasLocalStream: boolean;
  hasRemoteStream: boolean;
}

/**
 * Simulates a mobile app client for E2E testing
 *
 * Uses WebSocket signaling and node-webrtc for peer connection
 */
export class MobileSimulator {
  private ws: WebSocket | null = null;
  private pc: RTCPeerConnection | null = null;
  private dataChannel: RTCDataChannel | null = null;
  private logger: TestLogger;
  private options: MobileSimulatorOptions;
  private wsUrl: string;
  private apiBaseUrl: string;
  private token: string | null = null;
  private participantId: string | null = null;
  private role: 'host' | 'guest';
  private deviceName: string;
  private receivedMessages: string[] = [];
  private iceServers: RTCIceServer[];
  private iceCandidateBuffer: RTCIceCandidate[] = [];
  private hasSetRemoteDescription = false;
  private hasSentOffer = false;
  private localStream: any = null;
  private remoteStream: any = null;
  private pendingVideoInvite = false;
  private videoCallActive = false;
  private sessionEnded = false;
  private sessionEndedReason: string | null = null;
  private onVideoInviteCallback?: () => void;
  private onSessionEndedCallback?: (reason: string) => void;

  constructor(logger: TestLogger, options: MobileSimulatorOptions = {}) {
    this.logger = logger;
    this.options = {
      role: options.role || 'guest',
      deviceName: options.deviceName || 'MobileSimulator',
      autoConnect: options.autoConnect ?? true,
    };
    this.role = this.options.role!;
    this.deviceName = this.options.deviceName!;

    // If TEST_* TURN/STUN envs are missing, fall back to NEXT_PUBLIC_* values
    if (!process.env.TEST_WEBRTC_STUN_URLS && process.env.NEXT_PUBLIC_WEBRTC_STUN_URLS) {
      process.env.TEST_WEBRTC_STUN_URLS = process.env.NEXT_PUBLIC_WEBRTC_STUN_URLS;
    }
    if (!process.env.TEST_WEBRTC_TURN_URLS && process.env.NEXT_PUBLIC_WEBRTC_TURN_URLS) {
      process.env.TEST_WEBRTC_TURN_URLS = process.env.NEXT_PUBLIC_WEBRTC_TURN_URLS;
    }
    if (!process.env.TEST_WEBRTC_TURN_USER && process.env.NEXT_PUBLIC_WEBRTC_TURN_USER) {
      process.env.TEST_WEBRTC_TURN_USER = process.env.NEXT_PUBLIC_WEBRTC_TURN_USER;
    }
    if (!process.env.TEST_WEBRTC_TURN_PASSWORD && process.env.NEXT_PUBLIC_WEBRTC_TURN_PASSWORD) {
      process.env.TEST_WEBRTC_TURN_PASSWORD = process.env.NEXT_PUBLIC_WEBRTC_TURN_PASSWORD;
    }

    // Get WebSocket URL from environment
    const wsBaseUrl = process.env.TEST_WS_BASE_URL || 'ws://localhost:50003';
    this.wsUrl = wsBaseUrl.replace(/^http/, 'ws');
    // HTTP base for REST join
    this.apiBaseUrl = process.env.TEST_API_BASE_URL || 'http://localhost:50003';

    // Get ICE servers from environment
    this.iceServers = getIceServersFromEnv();

    if (!wrtc) {
      throw new Error('wrtc module not available. Install with: npm install wrtc');
    }
  }

  /**
   * Connect to session with token
   */
  async connect(token: string): Promise<void> {
    this.token = token;
    this.logger.info('Connecting to session', {
      token,
      role: this.role,
      wsUrl: this.wsUrl,
      apiBaseUrl: this.apiBaseUrl,
    });

    // Step 1: Join via REST to obtain participantId
    const joinPayload: { token: string; client_identity?: string } = {
      token,
      client_identity: this.deviceName,
    };

    const joinResponse = await fetch(`${this.apiBaseUrl}/api/sessions/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(joinPayload),
    });

    if (!joinResponse.ok) {
      const body = await joinResponse.text();
      throw new Error(`Join session failed: ${joinResponse.status} ${joinResponse.statusText} ${body}`);
    }

    const joinData = (await joinResponse.json()) as {
      participant_id: string;
      role: 'host' | 'guest';
    };

    this.participantId = joinData.participant_id;
    this.role = joinData.role || this.role;
    this.logger.info('Joined session via REST', { participantId: this.participantId, role: this.role });

    // Step 2: Open WebSocket with participantId
    await new Promise<void>((resolve, reject) => {
      const connectTimeout = setTimeout(() => {
        reject(new Error('WebSocket connection timeout'));
      }, 10000);

      this.ws = new WebSocket(
        `${this.wsUrl}/ws/sessions/${token}?participantId=${encodeURIComponent(this.participantId!)}`
      );

      this.ws.on('open', () => {
        clearTimeout(connectTimeout);
        this.logger.info('WebSocket connected');
        resolve();
      });

      this.ws.on('message', (data: WebSocket.Data) => {
        this.handleMessage(data.toString());
      });

      this.ws.on('error', (error) => {
        this.logger.error('WebSocket error', error);
        clearTimeout(connectTimeout);
        reject(error);
      });

      this.ws.on('close', () => {
        this.logger.info('WebSocket closed');
      });
    });

    // Step 3: Initialize peer connection and bootstrap data channel if host
    await this.handleSessionJoined({
      participant_id: this.participantId,
      role: this.role,
      token,
    });
  }

  /**
   * Initialize WebRTC peer connection
   */
  async initializePeerConnection(): Promise<void> {
    if (this.pc) {
      this.logger.info('Peer connection already exists');
      return;
    }

    this.logger.info('Creating peer connection', { iceServers: this.iceServers });

    this.pc = new wrtc.RTCPeerConnection({
      iceServers: this.iceServers,
    });

    const pc = this.pc;
    if (!pc) {
      throw new Error('Peer connection not initialized');
    }

    // Log connection state changes
    pc.onconnectionstatechange = () => {
      this.logger.webrtc('connection-state-change', {
        state: pc.connectionState,
      });
    };

    pc.oniceconnectionstatechange = () => {
      this.logger.webrtc('ice-connection-state-change', {
        state: pc.iceConnectionState,
      });
    };

    pc.onsignalingstatechange = () => {
      this.logger.webrtc('signaling-state-change', {
        state: pc.signalingState,
      });
    };

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.logger.webrtc('ice-candidate', {
          candidate: event.candidate.candidate,
        });
        // wrtc doesn't implement toJSON(), so manually serialize
        const candidateInit = {
          candidate: event.candidate.candidate,
          sdpMid: event.candidate.sdpMid,
          sdpMLineIndex: event.candidate.sdpMLineIndex,
          usernameFragment: event.candidate.usernameFragment,
        };
        this.sendSignal('iceCandidate', candidateInit);
      }
    };

    // Handle data channel from remote peer
    pc.ondatachannel = (event) => {
      this.logger.info('Received data channel from remote peer');
      this.setupDataChannel(event.channel);
    };

    // Handle remote streams
    pc.ontrack = (event) => {
      this.logger.webrtc('remote-track', {
        kind: event.track.kind,
        streams: event.streams.length,
      });
      if (event.streams[0]) {
        this.remoteStream = event.streams[0];
      }
    };

    // Create fake local media stream if role is host
    if (this.role === 'host' && this.options.autoConnect) {
      await this.createFakeMediaStream();
    }

    this.logger.info('Peer connection initialized');
  }

  /**
   * Create fake media stream for testing
   */
  private async createFakeMediaStream(): Promise<void> {
    try {
      if (!this.pc) {
        throw new Error('Peer connection not initialized');
      }

      // Create fake audio and video tracks
      const { nonstandard } = wrtc;
      const source = new nonstandard.RTCVideoSource();
      const track = source.createTrack();

      this.localStream = new wrtc.MediaStream([track]);

      // Add tracks to peer connection
      this.localStream.getTracks().forEach((track: any) => {
        this.pc!.addTrack(track, this.localStream);
      });

      this.logger.info('Fake media stream created and added');
    } catch (error) {
      const meta = error instanceof Error ? error : { error };
      this.logger.error('Failed to create fake media stream', meta);
    }
  }

  /**
   * Setup data channel
   */
  private capabilitiesSent = false;

  /**
   * Send capabilities announcement to peer
   */
  private sendCapabilities(): void {
    if (this.capabilitiesSent || !this.dataChannel || this.dataChannel.readyState !== 'open') {
      return;
    }
    this.logger.info('Sending capabilities to peer');
    this.dataChannel.send(JSON.stringify({
      type: 'capabilities',
      supportsEncryption: true,
    }));
    this.capabilitiesSent = true;
  }

  private setupDataChannel(channel: RTCDataChannel): void {
    this.dataChannel = channel;

    this.dataChannel.onopen = () => {
      this.logger.info('Data channel opened', { label: channel.label });
      // Send capabilities when data channel opens
      this.sendCapabilities();
    };

    this.dataChannel.onclose = () => {
      this.logger.info('Data channel closed');
    };

    this.dataChannel.onerror = (error) => {
      this.logger.error('Data channel error', error);
    };

    this.dataChannel.onmessage = async (event) => {
      this.logger.debug('Data channel message received', { data: event.data });

      try {
        const message = JSON.parse(event.data);

        // Handle browser's message format: {type: 'message', message: {...}}
        if (message.type === 'message' && message.message) {
          const browserMsg = message.message;
          this.logger.info('Browser message received', {
            messageId: browserMsg.messageId,
            hasEncryptedContent: !!browserMsg.encryptedContent,
            hasPlainContent: !!browserMsg.content,
          });

          // Try to decrypt if encrypted, otherwise use plain content
          if (browserMsg.encryptedContent && this.token) {
            try {
              const decrypted = await this.decryptMessage(browserMsg.encryptedContent);
              this.receivedMessages.push(decrypted);
              this.logger.info('Decrypted message received', { text: decrypted });
            } catch (decryptError) {
              // If decryption fails, store the encrypted content for debugging
              this.logger.warn('Failed to decrypt message, storing raw', { error: decryptError });
              this.receivedMessages.push(browserMsg.encryptedContent);
            }
          } else if (browserMsg.content) {
            // Plain text message
            this.receivedMessages.push(browserMsg.content);
            this.logger.info('Plain text message received', { text: browserMsg.content });
          }

          // Send ACK back to browser (as per protocol)
          if (browserMsg.messageId && this.dataChannel?.readyState === 'open') {
            this.dataChannel.send(JSON.stringify({
              type: 'ack',
              messageId: browserMsg.messageId,
            }));
          }
        }
        // Handle legacy text format: {type: 'text', text: '...'}
        else if (message.type === 'text' && message.text) {
          this.receivedMessages.push(message.text);
          this.logger.info('Text message received (legacy)', { text: message.text });
        }
        // Handle call protocol
        else if (message.type === 'call') {
          this.handleCallMessage(message);
        }
        // Handle video-decline from mobile app format (M2M compatibility)
        else if (message.type === 'video-decline') {
          this.logger.info('Received video decline from peer', { from: message.from });
          this.pendingVideoInvite = false;
          this.videoCallActive = false;
        }
        // Handle video-end from mobile app format (M2M compatibility)
        else if (message.type === 'video-end') {
          this.logger.info('Received video end from peer', { from: message.from });
          this.videoCallActive = false;
          // Clear remote stream
          this.remoteStream = null;
        }
        // Handle video-invite from mobile app format (M2M compatibility)
        else if (message.type === 'video-invite') {
          this.logger.info('Received video invite from peer (mobile format)');
          this.pendingVideoInvite = true;
          if (this.onVideoInviteCallback) {
            this.onVideoInviteCallback();
          }
        }
        // Handle video-accept from mobile app format (M2M compatibility)
        else if (message.type === 'video-accept') {
          this.logger.info('Received video accept from peer (mobile format)');
          this.videoCallActive = true;
        }
        // Handle capabilities announcement
        else if (message.type === 'capabilities') {
          this.logger.info('Received capabilities from peer', message);
          // Respond with our capabilities if we haven't already
          this.sendCapabilities();
        }
        // Handle ACK messages
        else if (message.type === 'ack') {
          this.logger.debug('Received ACK', { messageId: message.messageId });
        }
        // Unknown message type
        else {
          this.logger.warn('Unknown message type received', { type: message.type, message });
        }
      } catch (e) {
        // Not JSON, treat as plain text
        this.receivedMessages.push(event.data);
        this.logger.info('Plain text received (non-JSON)', { text: event.data });
      }
    };
  }

  /**
   * Handle call protocol messages from browser
   */
  private handleCallMessage(message: { type: 'call'; action: string; from?: string }): void {
    const action = message.action;
    this.logger.info('Received call message', { action, from: message.from });

    switch (action) {
      case 'request':
        // Browser is requesting video call
        this.pendingVideoInvite = true;
        this.logger.info('Received video invite from browser');
        if (this.onVideoInviteCallback) {
          this.onVideoInviteCallback();
        }
        break;

      case 'accept':
        // Browser accepted our video request
        this.videoCallActive = true;
        this.logger.info('Video invite accepted by browser');
        break;

      case 'reject':
        // Browser rejected our video request
        this.pendingVideoInvite = false;
        this.logger.info('Video invite rejected by browser');
        break;

      case 'cancel':
        // Browser cancelled their video request
        this.pendingVideoInvite = false;
        this.logger.info('Video invite cancelled by browser');
        break;

      case 'end':
        // Browser ended video call
        this.videoCallActive = false;
        this.logger.info('Video call ended by browser');
        break;

      default:
        this.logger.debug('Unknown call action', { action });
    }
  }

  /**
   * Handle incoming WebSocket message
   */
  private async handleMessage(data: string): Promise<void> {
    try {
      const message = JSON.parse(data);
      this.logger.signal('in', message.type || 'message', message);

      switch (message.type) {
        case 'session-joined':
          this.logger.info('Session joined', message);
          await this.handleSessionJoined(message);
          break;

        case 'signal':
          // Unwrap browser's signal envelope format
          const signalType = message.signalType as string;
          const payload = message.payload;

          this.logger.signal('in', signalType, payload);

          if (signalType === 'offer') {
            await this.handleOffer({ sdp: payload });
          } else if (signalType === 'answer') {
            await this.handleAnswer({ sdp: payload });
          } else if (signalType === 'iceCandidate') {
            await this.handleCandidate({ candidate: payload });
          } else {
            this.logger.debug('Unknown signal type', { signalType, payload });
          }
          break;

        case 'session-ended':
          this.logger.info('Session ended by peer', message);
          this.sessionEnded = true;
          this.sessionEndedReason = message.reason || 'Session ended by other participant';
          if (this.onSessionEndedCallback && this.sessionEndedReason) {
            this.onSessionEndedCallback(this.sessionEndedReason);
          }
          break;

        case 'session_deleted':
          this.logger.info('Session deleted (ended via API)', message);
          this.sessionEnded = true;
          this.sessionEndedReason = 'Session ended by other participant';
          if (this.onSessionEndedCallback) {
            this.onSessionEndedCallback('Session ended by other participant');
          }
          break;

        case 'session_closed':
          this.logger.info('Session closed', message);
          this.sessionEnded = true;
          this.sessionEndedReason = 'Session closed';
          if (this.onSessionEndedCallback) {
            this.onSessionEndedCallback('Session closed');
          }
          break;

        case 'session_expired':
          this.logger.info('Session expired', message);
          this.sessionEnded = true;
          this.sessionEndedReason = 'Session expired';
          if (this.onSessionEndedCallback) {
            this.onSessionEndedCallback('Session expired');
          }
          break;

        case 'status':
          // Handle status updates - re-send offer if we're host and guest just joined
          await this.handleStatusUpdate(message);
          break;

        default:
          this.logger.debug('Unknown message type', message);
      }
    } catch (error) {
      this.logger.error('Failed to parse message', { error, data });
    }
  }

  /**
   * Handle session joined
   */
  private async handleSessionJoined(message: any): Promise<void> {
    await this.initializePeerConnection();

    // If we're the host and auto-connect is enabled, create data channel and send offer
    if (this.role === 'host' && this.options.autoConnect) {
      // Create data channel (host creates it)
      this.dataChannel = this.pc!.createDataChannel('chat', {
        ordered: true,
      });
      this.setupDataChannel(this.dataChannel);

      // Small delay to avoid duplicate offers
      await this.wait(100);

      // Send offer if not already sent
      if (!this.hasSentOffer && this.pc!.signalingState === 'stable') {
        await this.createAndSendOffer();
      }
    }
  }

  /**
   * Handle status update - re-send offer when guest joins
   */
  private async handleStatusUpdate(message: any): Promise<void> {
    const connectedParticipants = message.connected_participants || [];
    const sessionStatus = message.status;

    this.logger.info('Status update received', {
      connectedParticipants: connectedParticipants.length,
      sessionStatus,
      role: this.role,
    });

    // If we're host, session is active, 2 participants connected, and we haven't established connection
    if (
      this.role === 'host' &&
      sessionStatus === 'active' &&
      connectedParticipants.length === 2 &&
      this.pc &&
      this.pc.connectionState !== 'connected' &&
      (this.pc.connectionState as string) !== 'completed'
    ) {
      // Check if we need to re-send offer (e.g., the guest joined after we sent our first offer)
      if (this.pc.signalingState === 'stable' || this.pc.signalingState === 'have-local-offer') {
        this.logger.info('Guest joined - resending offer');
        // Reset state and send new offer
        this.hasSentOffer = false;
        this.hasSetRemoteDescription = false;

        // Small delay to let things settle
        await this.wait(200);

        if (this.pc.signalingState === 'stable') {
          await this.createAndSendOffer();
        } else if (this.pc.signalingState === 'have-local-offer') {
          // Already have an offer, just re-send it
          if (this.pc.localDescription) {
            this.logger.info('Re-sending existing offer');
            this.sendSignal('offer', this.pc.localDescription);
            this.hasSentOffer = true;
          }
        }
      }
    }
  }

  /**
   * Handle incoming offer
   */
  private async handleOffer(message: any): Promise<void> {
    this.logger.info('Handling offer');

    if (!this.pc) {
      await this.initializePeerConnection();
    }

    if (this.pc!.signalingState !== 'stable') {
      this.logger.warn('Received offer but signaling state is not stable', {
        state: this.pc!.signalingState,
      });
      // Handle glare - let the host win
      if (this.role === 'guest') {
        this.logger.info('Guest accepting offer despite non-stable state');
      } else {
        this.logger.info('Host ignoring offer - should not receive offers');
        return;
      }
    }

    try {
      await this.pc!.setRemoteDescription(new wrtc.RTCSessionDescription(message.sdp));
      this.hasSetRemoteDescription = true;
      this.logger.info('Remote description set (offer)');

      // Flush buffered ICE candidates
      await this.flushIceCandidateBuffer();

      // Create and send answer
      const answer = await this.pc!.createAnswer();
      await this.pc!.setLocalDescription(answer);
      this.logger.info('Local description set (answer)');

      this.sendSignal('answer', this.pc!.localDescription);
    } catch (error) {
      const meta = error instanceof Error ? error : { error };
      this.logger.error('Failed to handle offer', meta);
      throw error;
    }
  }

  /**
   * Handle incoming answer
   */
  private async handleAnswer(message: any): Promise<void> {
    this.logger.info('Handling answer');

    if (!this.pc) {
      this.logger.error('Received answer but no peer connection exists');
      return;
    }

    if (this.pc.signalingState !== 'have-local-offer') {
      this.logger.warn('Received answer but signaling state is not have-local-offer', {
        state: this.pc.signalingState,
      });
      // This is the bug we fixed - skip invalid answers
      return;
    }

    try {
      await this.pc.setRemoteDescription(new wrtc.RTCSessionDescription(message.sdp));
      this.hasSetRemoteDescription = true;
      this.logger.info('Remote description set (answer)');

      // Flush buffered ICE candidates
      await this.flushIceCandidateBuffer();
    } catch (error) {
      const meta = error instanceof Error ? error : { error };
      this.logger.error('Failed to handle answer', meta);
      throw error;
    }
  }

  /**
   * Handle incoming ICE candidate
   */
  private async handleCandidate(message: any): Promise<void> {
    if (!this.pc) {
      this.logger.warn('Received candidate but no peer connection exists');
      return;
    }

    const candidate = new wrtc.RTCIceCandidate(message.candidate);

      if (this.hasSetRemoteDescription) {
        try {
          await this.pc.addIceCandidate(candidate);
          this.logger.webrtc('ice-candidate-added', {
            candidate: candidate.candidate,
          });
        } catch (error) {
          const meta = error instanceof Error ? error : { error };
          this.logger.error('Failed to add ICE candidate', meta);
        }
      } else {
        // Buffer candidate until remote description is set
        this.iceCandidateBuffer.push(candidate);
        this.logger.debug('ICE candidate buffered', {
        bufferSize: this.iceCandidateBuffer.length,
      });
    }
  }

  /**
   * Flush buffered ICE candidates
   */
  private async flushIceCandidateBuffer(): Promise<void> {
    if (this.iceCandidateBuffer.length === 0) {
      return;
    }

    this.logger.info('Flushing ICE candidate buffer', {
      count: this.iceCandidateBuffer.length,
    });

    for (const candidate of this.iceCandidateBuffer) {
      try {
        await this.pc!.addIceCandidate(candidate);
        this.logger.webrtc('ice-candidate-added', {
          candidate: candidate.candidate,
        });
      } catch (error) {
        const meta = error instanceof Error ? error : { error };
        this.logger.error('Failed to add buffered ICE candidate', meta);
      }
    }

    this.iceCandidateBuffer = [];
  }

  /**
   * Create and send offer
   */
  private async createAndSendOffer(): Promise<void> {
    if (!this.pc) {
      throw new Error('Peer connection not initialized');
    }

    if (this.hasSentOffer) {
      this.logger.warn('Skipping offer creation - already sent');
      return;
    }

    this.logger.info('Creating offer');

    try {
      const offer = await this.pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
      });

      await this.pc.setLocalDescription(offer);
      this.hasSentOffer = true;
      this.logger.info('Local description set (offer)');

      this.sendSignal('offer', this.pc.localDescription);
    } catch (error) {
      const meta = error instanceof Error ? error : { error };
      this.logger.error('Failed to create offer', meta);
      throw error;
    }
  }

  /**
   * Send signaling message via WebSocket (wrapped in browser's envelope format)
   */
  private sendSignal(signalType: string, payload: unknown): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.logger.error('Cannot send signal - WebSocket not open');
      return;
    }

    const message = {
      type: 'signal',
      signalType,
      payload,
    };

    this.logger.signal('out', signalType, typeof payload === 'object' && payload !== null ? payload : { payload });
    this.ws.send(JSON.stringify(message));
  }

  /**
   * Wait for WebRTC connection to establish
   */
  async waitForConnection(timeout = 30000): Promise<void> {
    this.logger.info('Waiting for WebRTC connection');

    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      if (!this.pc) {
        await this.wait(500);
        continue;
      }

      const state = this.pc.connectionState;

      if (state === 'connected' || (state as string) === 'completed') {
        this.logger.info('WebRTC connection established', { state });
        return;
      }

      if (state === 'failed' || state === 'closed') {
        throw new Error(`WebRTC connection failed: ${state}`);
      }

      await this.wait(500);
    }

    throw new Error(`WebRTC connection timeout after ${timeout}ms`);
  }

  /**
   * Wait for data channel to open
   */
  async waitForDataChannel(timeout = 30000): Promise<void> {
    this.logger.info('Waiting for data channel to open');

    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      if (this.dataChannel && this.dataChannel.readyState === 'open') {
        this.logger.info('Data channel opened');
        return;
      }

      if (this.dataChannel && this.dataChannel.readyState === 'closed') {
        throw new Error('Data channel closed');
      }

      await this.wait(500);
    }

    throw new Error(`Data channel timeout after ${timeout}ms`);
  }

  /**
   * Send text message
   */
  async sendMessage(text: string): Promise<void> {
    if (!this.dataChannel || this.dataChannel.readyState !== 'open') {
      throw new Error('Data channel not open');
    }

    this.logger.info('Sending message', { text });

    const message = JSON.stringify({
      type: 'text',
      text,
      timestamp: Date.now(),
    });

    this.dataChannel.send(message);
  }

  /**
   * Normalize text for comparison (handle escaped vs literal special chars)
   */
  private normalizeText(text: string): string {
    return text
      .replace(/\\n/g, '\n')
      .replace(/\\t/g, '\t')
      .replace(/\\r/g, '\r');
  }

  /**
   * Check if text contains expected content (handles special chars)
   */
  private textContains(haystack: string, needle: string): boolean {
    const normalizedHaystack = this.normalizeText(haystack);
    const normalizedNeedle = this.normalizeText(needle);

    // Direct check
    if (normalizedHaystack.includes(normalizedNeedle)) {
      return true;
    }

    // Check with escaped quotes
    const escapedNeedle = normalizedNeedle.replace(/"/g, '\\"');
    if (normalizedHaystack.includes(escapedNeedle)) {
      return true;
    }

    // Check with whitespace normalized
    const wsNormalizedHaystack = normalizedHaystack.replace(/\s+/g, ' ');
    const wsNormalizedNeedle = normalizedNeedle.replace(/\s+/g, ' ');

    return wsNormalizedHaystack.includes(wsNormalizedNeedle);
  }

  /**
   * Wait for message to be received
   */
  async waitForMessage(expectedText: string, timeout = 10000): Promise<void> {
    this.logger.info('Waiting for message', { expectedText });

    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      if (this.receivedMessages.some(msg => this.textContains(msg, expectedText))) {
        this.logger.info('Message received', { expectedText });
        return;
      }

      await this.wait(500);
    }

    throw new Error(`Message "${expectedText}" not received within ${timeout}ms`);
  }

  /**
   * Get current WebRTC state
   */
  getWebRTCState(): WebRTCState {
    if (!this.pc) {
      return {
        connectionState: 'new',
        iceConnectionState: 'new',
        signalingState: 'stable',
        dataChannelState: null,
        hasLocalStream: false,
        hasRemoteStream: false,
      };
    }

    return {
      connectionState: this.pc.connectionState,
      iceConnectionState: this.pc.iceConnectionState,
      signalingState: this.pc.signalingState,
      dataChannelState: this.dataChannel?.readyState || null,
      hasLocalStream: !!this.localStream,
      hasRemoteStream: !!this.remoteStream,
    };
  }

  /**
   * Get received messages
   */
  getReceivedMessages(): string[] {
    return [...this.receivedMessages];
  }

  /**
   * Send video invite to remote peer
   */
  sendVideoInvite(): void {
    if (!this.dataChannel || this.dataChannel.readyState !== 'open') {
      throw new Error('Data channel not open');
    }

    this.logger.info('Sending video invite');

    const message = JSON.stringify({
      type: 'call',
      action: 'request',
      from: this.participantId,
    });

    this.dataChannel.send(message);
  }

  /**
   * Initiate a video call - adds local media tracks and sends invite
   * This triggers onnegotiationneeded which creates an offer
   */
  async initiateVideoCall(): Promise<void> {
    if (!this.dataChannel || this.dataChannel.readyState !== 'open') {
      throw new Error('Data channel not open');
    }

    this.logger.info('Initiating video call');

    // First add local media tracks - this triggers onnegotiationneeded
    this.createFakeMediaStream();

    // Send the video invite message
    this.sendVideoInvite();

    this.videoCallActive = true;
    this.logger.info('Video call initiated with local media');
  }

  /**
   * Accept video invite and add local media tracks
   * This triggers onnegotiationneeded for the response
   */
  async acceptVideoCallWithMedia(): Promise<void> {
    if (!this.dataChannel || this.dataChannel.readyState !== 'open') {
      throw new Error('Data channel not open');
    }

    if (!this.pendingVideoInvite) {
      this.logger.warn('No pending video invite to accept');
    }

    this.logger.info('Accepting video invite with media');

    // Add local media tracks - this triggers onnegotiationneeded
    this.createFakeMediaStream();

    // Send accept message
    const message = JSON.stringify({
      type: 'call',
      action: 'accept',
      from: this.participantId,
    });

    this.dataChannel.send(message);
    this.pendingVideoInvite = false;
    this.videoCallActive = true;

    this.logger.info('Video call accepted with local media');
  }

  /**
   * Accept video invite from remote peer
   */
  acceptVideoInvite(): void {
    if (!this.dataChannel || this.dataChannel.readyState !== 'open') {
      throw new Error('Data channel not open');
    }

    if (!this.pendingVideoInvite) {
      this.logger.warn('No pending video invite to accept');
    }

    this.logger.info('Accepting video invite');

    const message = JSON.stringify({
      type: 'call',
      action: 'accept',
      from: this.participantId,
    });

    this.dataChannel.send(message);
    this.pendingVideoInvite = false;
    this.videoCallActive = true;
  }

  /**
   * Decline video invite from remote peer
   * Uses same format as actual mobile app: { type: 'video-decline', action: 'decline' }
   * Also supports browser format { type: 'call', action: 'reject' } for B2M compatibility
   */
  declineVideoInvite(): void {
    if (!this.dataChannel || this.dataChannel.readyState !== 'open') {
      throw new Error('Data channel not open');
    }

    this.logger.info('Declining video invite');

    // Use mobile app format for M2M consistency
    const message = JSON.stringify({
      type: 'video-decline',
      action: 'decline',
      from: this.participantId,
    });

    this.dataChannel.send(message);
    this.pendingVideoInvite = false;
  }

  /**
   * End video call - sends end message and stops local tracks
   * This simulates the mobile app's stopVideo() behavior
   */
  endVideoCall(): void {
    if (!this.dataChannel || this.dataChannel.readyState !== 'open') {
      throw new Error('Data channel not open');
    }

    this.logger.info('Ending video call');

    // Send end message to remote peer
    const message = JSON.stringify({
      type: 'call',
      action: 'end',
      from: this.participantId,
    });

    this.dataChannel.send(message);

    // Stop local media tracks (simulates stopVideoTracks)
    if (this.localStream) {
      this.localStream.getTracks().forEach((track: any) => {
        track.stop();
        // Remove track from peer connection (only if connection is still open)
        if (this.pc && (this.pc as any).signalingState !== 'closed') {
          try {
            const senders = (this.pc as any).getSenders?.();
            if (senders) {
              senders.forEach((sender: any) => {
                if (sender.track === track) {
                  (this.pc as any).removeTrack?.(sender);
                }
              });
            }
          } catch (e) {
            this.logger.debug('Could not remove track from peer connection', { error: (e as Error).message });
          }
        }
      });
      this.localStream = null;
    }

    // Clear remote stream reference
    this.remoteStream = null;
    this.videoCallActive = false;
  }

  /**
   * Wait for video call to end (received end message from remote)
   */
  async waitForVideoCallEnded(timeout = 15000): Promise<void> {
    this.logger.info('Waiting for video call to end');

    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      if (!this.videoCallActive) {
        this.logger.info('Video call has ended');
        return;
      }

      await this.wait(500);
    }

    throw new Error(`Video call did not end within ${timeout}ms`);
  }

  /**
   * Check if we have remote audio track
   */
  hasRemoteAudioTrack(): boolean {
    if (!this.remoteStream) {
      return false;
    }
    return this.remoteStream.getAudioTracks().length > 0;
  }

  /**
   * Check if we have remote video track
   */
  hasRemoteVideoTrack(): boolean {
    if (!this.remoteStream) {
      return false;
    }
    return this.remoteStream.getVideoTracks().length > 0;
  }

  /**
   * Get remote stream info for debugging
   */
  getRemoteStreamInfo(): { hasAudio: boolean; hasVideo: boolean; trackCount: number } {
    if (!this.remoteStream) {
      return { hasAudio: false, hasVideo: false, trackCount: 0 };
    }
    return {
      hasAudio: this.remoteStream.getAudioTracks().length > 0,
      hasVideo: this.remoteStream.getVideoTracks().length > 0,
      trackCount: this.remoteStream.getTracks().length,
    };
  }

  /**
   * Wait for video invite from remote peer
   */
  async waitForVideoInvite(timeout = 30000): Promise<void> {
    this.logger.info('Waiting for video invite');

    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      if (this.pendingVideoInvite) {
        this.logger.info('Video invite received');
        return;
      }

      await this.wait(500);
    }

    throw new Error(`Video invite not received within ${timeout}ms`);
  }

  /**
   * Set callback for video invite
   */
  onVideoInvite(callback: () => void): void {
    this.onVideoInviteCallback = callback;
  }

  /**
   * Check if video invite is pending
   */
  hasPendingVideoInvite(): boolean {
    return this.pendingVideoInvite;
  }

  /**
   * Check if video call is active
   */
  isVideoCallActive(): boolean {
    return this.videoCallActive;
  }

  /**
   * Wait for video call to become active
   */
  async waitForVideoCallActive(timeout = 30000): Promise<void> {
    this.logger.info('Waiting for video call to become active');

    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      if (this.videoCallActive) {
        this.logger.info('Video call is now active');
        return;
      }

      await this.wait(500);
    }

    throw new Error(`Video call did not become active within ${timeout}ms`);
  }

  /**
   * Wait for specified time
   */
  private async wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Close connection
   */
  async close(): Promise<void> {
    this.logger.info('Closing mobile simulator');

    if (this.dataChannel) {
      this.dataChannel.close();
      this.dataChannel = null;
    }

    if (this.pc) {
      this.pc.close();
      this.pc = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    // Reset state for next connection
    this.capabilitiesSent = false;
    this.receivedMessages = [];

    this.logger.info('Mobile simulator closed');
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  /**
   * End the session via API (triggers session_deleted notification to other party)
   */
  async endSession(): Promise<void> {
    if (!this.token) {
      throw new Error('No token available - not connected to session');
    }

    this.logger.info('Ending session via API', { token: this.token });

    const response = await fetch(`${this.apiBaseUrl}/api/sessions/${this.token}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Failed to end session: ${response.status} ${response.statusText} ${body}`);
    }

    this.sessionEnded = true;
    this.sessionEndedReason = 'Session ended by self';
    this.logger.info('Session ended successfully');
  }

  /**
   * Check if session has ended
   */
  isSessionEnded(): boolean {
    return this.sessionEnded;
  }

  /**
   * Get reason why session ended
   */
  getSessionEndedReason(): string | null {
    return this.sessionEndedReason;
  }

  /**
   * Set callback for session ended event
   */
  onSessionEnded(callback: (reason: string) => void): void {
    this.onSessionEndedCallback = callback;
  }

  /**
   * Wait for session to end (notification from other party)
   */
  async waitForSessionEnded(timeout = 15000): Promise<void> {
    this.logger.info('Waiting for session to end');

    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      if (this.sessionEnded) {
        this.logger.info('Session ended', { reason: this.sessionEndedReason });
        return;
      }

      await this.wait(500);
    }

    throw new Error(`Session did not end within ${timeout}ms`);
  }

  /**
   * Derive encryption key from token (matching browser's algorithm)
   * Uses SHA-256 hash of token (matching browser implementation)
   */
  private async deriveKey(token: string): Promise<Buffer> {
    // Browser uses: crypto.subtle.digest("SHA-256", token)
    // which is a simple SHA-256 hash of the token
    return crypto.createHash('sha256').update(token).digest();
  }

  /**
   * Decrypt a message encrypted with AES-256-GCM
   * Format: base64(IV + ciphertext + authTag)
   */
  private async decryptMessage(encryptedBase64: string): Promise<string> {
    if (!this.token) {
      throw new Error('No token available for decryption');
    }

    try {
      // Decode base64
      const encrypted = Buffer.from(encryptedBase64, 'base64');

      // Extract IV (first 12 bytes), ciphertext (middle), and auth tag (last 16 bytes)
      const iv = encrypted.subarray(0, 12);
      const authTag = encrypted.subarray(encrypted.length - 16);
      const ciphertext = encrypted.subarray(12, encrypted.length - 16);

      // Derive key from token
      const key = await this.deriveKey(this.token);

      // Create decipher
      const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
      decipher.setAuthTag(authTag);

      // Decrypt
      const decrypted = Buffer.concat([
        decipher.update(ciphertext),
        decipher.final(),
      ]);

      return decrypted.toString('utf8');
    } catch (error) {
      this.logger.error('Decryption failed', error as Error);
      throw error;
    }
  }
}
