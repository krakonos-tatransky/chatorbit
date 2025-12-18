import type { ComponentType } from 'react';
import type {
  RTCPeerConnection as NativeRTCPeerConnection,
  RTCIceCandidate as NativeRTCIceCandidate,
  RTCSessionDescription as NativeRTCSessionDescription,
  MediaStream as NativeMediaStream,
  RTCTrackEvent as NativeRTCTrackEvent,
} from 'react-native-webrtc';

export type RTCPeerConnection = NativeRTCPeerConnection;
export type RTCIceCandidate = NativeRTCIceCandidate;
export type RTCSessionDescription = NativeRTCSessionDescription;
export type MediaStream = NativeMediaStream;
export type RTCTrackEvent = NativeRTCTrackEvent;
export type RTCViewComponent = ComponentType<{ streamURL: string; objectFit?: string; mirror?: boolean }>;

export type WebRtcBindings = {
  RTCPeerConnection: new (...args: any[]) => NativeRTCPeerConnection;
  RTCIceCandidate: new (...args: any[]) => NativeRTCIceCandidate;
  RTCSessionDescription: new (...args: any[]) => NativeRTCSessionDescription;
  RTCView?: RTCViewComponent;
  mediaDevices?: {
    getUserMedia: (constraints: Record<string, unknown>) => Promise<MediaStream>;
  };
};

export type DataChannelState = 'connecting' | 'open' | 'closing' | 'closed';

export type PeerDataChannel = ReturnType<RTCPeerConnection['createDataChannel']> & {
  onopen: (() => void) | null;
  onclose: (() => void) | null;
  onerror: (() => void) | null;
  onmessage: ((event: MessageEvent) => void) | null;
};
