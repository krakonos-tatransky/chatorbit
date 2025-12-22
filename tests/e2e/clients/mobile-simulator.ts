import WebSocket from 'ws';
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
  private setupDataChannel(channel: RTCDataChannel): void {
    this.dataChannel = channel;

    this.dataChannel.onopen = () => {
      this.logger.info('Data channel opened', { label: channel.label });
    };

    this.dataChannel.onclose = () => {
      this.logger.info('Data channel closed');
    };

    this.dataChannel.onerror = (error) => {
      this.logger.error('Data channel error', error);
    };

    this.dataChannel.onmessage = (event) => {
      this.logger.info('Data channel message received', { data: event.data });

      try {
        const message = JSON.parse(event.data);
        if (message.type === 'text' && message.text) {
          this.receivedMessages.push(message.text);
          this.logger.info('Text message received', { text: message.text });
        }
      } catch (e) {
        // Not JSON, treat as plain text
        this.receivedMessages.push(event.data);
      }
    };
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
          this.logger.info('Session ended', message);
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
   * Wait for message to be received
   */
  async waitForMessage(expectedText: string, timeout = 10000): Promise<void> {
    this.logger.info('Waiting for message', { expectedText });

    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      if (this.receivedMessages.some(msg => msg.includes(expectedText))) {
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

    this.logger.info('Mobile simulator closed');
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}
