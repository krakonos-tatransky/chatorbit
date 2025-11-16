declare module 'expo-webrtc' {
  export type ExpoRTCDataChannel = {
    readyState: RTCDataChannelState | string;
    send: (data: string | ArrayBuffer | ArrayBufferView | Blob) => void;
    close: () => void;
    onopen: (() => void) | null;
    onclose: (() => void) | null;
    onmessage: ((event: MessageEvent<any>) => void) | null;
  };

  export class RTCPeerConnection {
    constructor(configuration?: RTCConfiguration);
    createDataChannel(label: string, dataChannelDict?: RTCDataChannelInit): ExpoRTCDataChannel;
    createOffer(options?: RTCOfferOptions): Promise<RTCSessionDescriptionInit>;
    createAnswer(options?: RTCAnswerOptions): Promise<RTCSessionDescriptionInit>;
    setLocalDescription(description?: RTCSessionDescriptionInit | RTCSessionDescription): Promise<void>;
    setRemoteDescription(description: RTCSessionDescriptionInit | RTCSessionDescription): Promise<void>;
    addIceCandidate(candidate?: RTCIceCandidate | RTCIceCandidateInit | null): Promise<void>;
    close(): void;
    connectionState: RTCPeerConnectionState | string;
    iceConnectionState: RTCIceConnectionState | string;
    remoteDescription: RTCSessionDescription | null;
    onicecandidate: ((event: RTCPeerConnectionIceEvent) => void) | null;
    onconnectionstatechange: (() => void) | null;
    oniceconnectionstatechange: (() => void) | null;
    ondatachannel: ((event: RTCDataChannelEvent) => void) | null;
  }

  export class RTCIceCandidate {
    constructor(init?: RTCIceCandidateInit);
  }

  export class RTCSessionDescription {
    constructor(init: RTCSessionDescriptionInit);
  }
}
