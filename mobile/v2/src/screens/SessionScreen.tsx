/**
 * Session Screen
 *
 * Main session screen with chat-first interface.
 * Video is optional - initiated via floating camera button.
 * Supports: chat-only, video invite, active video, and fullscreen modes.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  TouchableOpacity,
  Animated,
  PanResponder,
  Dimensions,
  Modal,
  Keyboard,
  AppState,
  type GestureResponderEvent,
  type PanResponderGestureState,
  type AppStateStatus,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RTCView } from 'react-native-webrtc';
import InCallManager from 'react-native-incall-manager';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Button, Input, StatusDot } from '@/components/ui';
import { COLORS, SPACING, TEXT_STYLES, RADIUS } from '@/constants';
import {
  useSessionStore,
  useMessagesStore,
  useConnectionStore,
  selectIsConnected,
  selectMessages,
  selectIsHost,
  selectIsSending,
} from '@/state';
import { webrtcManager } from '@/webrtc';
import type { Message } from '@/state';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const LOCAL_VIDEO_WIDTH = 100;
const LOCAL_VIDEO_HEIGHT = 140;

type VideoMode = 'idle' | 'inviting' | 'invited' | 'active' | 'fullscreen';

type RootStackParamList = {
  Splash: undefined;
  Main: undefined;
  Session: undefined;
};

type SessionScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Session'
>;

interface SessionScreenProps {
  navigation: SessionScreenNavigationProp;
}

export const SessionScreen: React.FC<SessionScreenProps> = ({ navigation }) => {
  const [messageText, setMessageText] = useState('');
  const [displayTime, setDisplayTime] = useState<number | null>(null);

  // Video state
  const [videoMode, setVideoMode] = useState<VideoMode>('idle');
  const [localStream, setLocalStream] = useState<any>(null);
  const [remoteStream, setRemoteStream] = useState<any>(null);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [speakerEnabled, setSpeakerEnabled] = useState(false);
  const [isFrontCamera, setIsFrontCamera] = useState(true);
  const [isSwitchingCamera, setIsSwitchingCamera] = useState(false);

  // Footer visibility for fullscreen mode
  const [footerVisible, setFooterVisible] = useState(true);
  const footerOpacity = useRef(new Animated.Value(1)).current;

  // Session ended modal
  const [showSessionEndedModal, setShowSessionEndedModal] = useState(false);

  // End session confirmation modal
  const [showEndConfirmModal, setShowEndConfirmModal] = useState(false);

  // Draggable local video position
  const pan = useRef(new Animated.ValueXY({ x: SPACING.md, y: SPACING.md })).current;

  const scrollViewRef = useRef<ScrollView>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const footerTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Session state
  const token = useSessionStore((state) => state.token);
  const participantId = useSessionStore((state) => state.participantId);
  const sessionExpiresAt = useSessionStore((state) => state.sessionExpiresAt);
  const isHost = useSessionStore(selectIsHost);

  // Messages state
  const messages = useMessagesStore(selectMessages);
  const isSending = useMessagesStore(selectIsSending);

  // Connection state
  const isConnected = useConnectionStore(selectIsConnected);

  // Pan responder for draggable local video
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        pan.setOffset({
          x: (pan.x as any)._value,
          y: (pan.y as any)._value,
        });
      },
      onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], {
        useNativeDriver: false,
      }),
      onPanResponderRelease: () => {
        pan.flattenOffset();
        // Clamp to screen bounds
        const currentX = (pan.x as any)._value;
        const currentY = (pan.y as any)._value;
        const clampedX = Math.max(SPACING.md, Math.min(currentX, SCREEN_WIDTH - LOCAL_VIDEO_WIDTH - SPACING.md));
        const clampedY = Math.max(SPACING.md, Math.min(currentY, SCREEN_HEIGHT - LOCAL_VIDEO_HEIGHT - 200));
        Animated.spring(pan, {
          toValue: { x: clampedX, y: clampedY },
          useNativeDriver: false,
        }).start();
      },
    })
  ).current;

  // End session and navigate directly to Main
  const endSessionAndNavigate = useCallback(async () => {
    try {
      // Stop InCallManager audio routing
      InCallManager.stop();
      await webrtcManager.endSession();
      await useSessionStore.getState().endSession();
    } catch (error) {
      console.error('Failed to end session:', error);
    }
    // Navigate immediately to Main
    navigation.reset({
      index: 0,
      routes: [{ name: 'Main' }],
    });
  }, [navigation]);

  // Handle modal dismiss - navigate to Main (for remote-triggered end)
  const handleSessionEndedDismiss = useCallback(() => {
    setShowSessionEndedModal(false);
    navigation.reset({
      index: 0,
      routes: [{ name: 'Main' }],
    });
  }, [navigation]);

  // End session with confirmation - show custom modal
  const handleEndSession = useCallback(() => {
    setShowEndConfirmModal(true);
  }, []);

  // Confirm end session from modal
  const handleConfirmEndSession = useCallback(() => {
    setShowEndConfirmModal(false);
    endSessionAndNavigate();
  }, [endSessionAndNavigate]);

  // Cancel end session
  const handleCancelEndSession = useCallback(() => {
    setShowEndConfirmModal(false);
  }, []);

  // Initialize signaling connection (no video yet)
  useEffect(() => {
    if (!token || !participantId) {
      // No token - navigate back to Main (silently, as this happens after ending session)
      navigation.navigate('Main');
      return;
    }

    // Initialize WebRTC signaling without starting video
    webrtcManager.initializeSignaling(token, participantId, isHost);

    // Listen for video invite from remote peer
    const handleVideoInvite = () => {
      setVideoMode('invited');
      Alert.alert(
        'Video Call',
        'The other participant wants to start a video call',
        [
          { text: 'Decline', style: 'cancel', onPress: () => {
            webrtcManager.declineVideoInvite();
            setVideoMode('idle');
          }},
          { text: 'Accept', onPress: acceptVideoCall },
        ]
      );
    };

    // Listen for remote stream via callback (primary mechanism)
    webrtcManager.onRemoteStream = (stream) => {
      console.log('[Session] Remote stream callback:', stream ? 'stream received' : 'stream cleared');
      setRemoteStream(stream);
      if (stream) {
        // Use functional setState to avoid stale closure issues
        setVideoMode((currentMode) => {
          if (currentMode === 'inviting' || currentMode === 'invited') {
            return 'active';
          }
          return currentMode;
        });
      }
    };

    // Backup polling in case callback doesn't fire (defensive)
    let lastStreamUrl: string | null = null;
    const checkRemoteStream = setInterval(() => {
      const remote = webrtcManager.getRemoteStream();
      if (remote) {
        const newUrl = remote.toURL();
        if (newUrl !== lastStreamUrl) {
          console.log('[Session] Polling detected new remote stream');
          lastStreamUrl = newUrl;
          setRemoteStream(remote);
          setVideoMode((currentMode) => {
            if (currentMode === 'inviting' || currentMode === 'invited') {
              return 'active';
            }
            return currentMode;
          });
        }
      }
    }, 500);

    webrtcManager.onVideoInvite = handleVideoInvite;

    // Listen for remote peer ending video
    webrtcManager.onVideoEnded = () => {
      console.log('[Session] Remote peer ended video');
      InCallManager.stop();
      setVideoMode('idle');
      setLocalStream(null);
      setRemoteStream(null);
      setVideoEnabled(true);
      setAudioEnabled(true);
      setSpeakerEnabled(false);
    };

    // Listen for remote peer accepting our video invite
    webrtcManager.onVideoAccepted = () => {
      console.log('[Session] Remote peer accepted video invite');
      setVideoMode('active');
    };

    // Listen for remote peer declining our video invite
    webrtcManager.onVideoDeclined = () => {
      console.log('[Session] Remote peer declined video invite');
      InCallManager.stop();
      setVideoMode('idle');
      setLocalStream(null);
    };

    // Listen for remote peer ending the session entirely
    webrtcManager.onSessionEnded = (reason?: string) => {
      console.log('[Session] Remote peer ended session:', reason);
      InCallManager.stop();
      setVideoMode('idle');
      setLocalStream(null);
      setRemoteStream(null);
      // Show modal instead of navigating immediately
      setShowSessionEndedModal(true);
    };

    return () => {
      clearInterval(checkRemoteStream);
      webrtcManager.onRemoteStream = undefined;
      webrtcManager.onVideoInvite = undefined;
      webrtcManager.onVideoEnded = undefined;
      webrtcManager.onVideoAccepted = undefined;
      webrtcManager.onVideoDeclined = undefined;
      webrtcManager.onSessionEnded = undefined;
    };
  }, [token, participantId, isHost, navigation]);  // Removed videoMode from deps - using functional setState

  // AppState monitoring for connection recovery when app returns from background
  useEffect(() => {
    const appStateRef = { current: AppState.currentState };

    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      // When app comes to foreground from background/inactive
      if (
        (appStateRef.current === 'background' || appStateRef.current === 'inactive') &&
        nextAppState === 'active'
      ) {
        console.log('[Session] App returned to foreground - checking connection');
        // Attempt connection recovery after returning from background
        webrtcManager.attemptConnectionRecovery();
      }
      appStateRef.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription?.remove();
    };
  }, []);

  // Countdown timer
  useEffect(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (!sessionExpiresAt) {
      setDisplayTime(null);
      return;
    }

    const calculateRemaining = () => {
      const now = Date.now();
      const expiresAt = new Date(sessionExpiresAt).getTime();
      return Math.max(0, Math.floor((expiresAt - now) / 1000));
    };

    setDisplayTime(calculateRemaining());

    timerRef.current = setInterval(() => {
      const remaining = calculateRemaining();
      setDisplayTime(remaining);

      if (remaining <= 0) {
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        endSessionAndNavigate();
      }
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [sessionExpiresAt, endSessionAndNavigate]);

  // Auto-scroll messages
  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [messages.length]);

  // Auto-hide footer in fullscreen mode
  useEffect(() => {
    if (videoMode === 'fullscreen') {
      // Start auto-hide timer
      footerTimeoutRef.current = setTimeout(() => {
        Animated.timing(footerOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start(() => setFooterVisible(false));
      }, 3000);
    } else {
      // Show footer
      if (footerTimeoutRef.current) {
        clearTimeout(footerTimeoutRef.current);
      }
      setFooterVisible(true);
      Animated.timing(footerOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }

    return () => {
      if (footerTimeoutRef.current) {
        clearTimeout(footerTimeoutRef.current);
      }
    };
  }, [videoMode, footerOpacity]);

  // Start video call (send invite)
  const startVideoCall = async () => {
    try {
      setVideoMode('inviting');
      // Start InCallManager for audio routing (auto: false for manual speaker control)
      InCallManager.start({ media: 'video', auto: false });
      InCallManager.setForceSpeakerphoneOn(false); // Force earpiece mode
      setSpeakerEnabled(false);
      const stream = await webrtcManager.startVideo();
      setLocalStream(stream);
      webrtcManager.sendVideoInvite();
    } catch (error) {
      console.error('Failed to start video:', error);
      InCallManager.stop();
      setVideoMode('idle');
      Alert.alert('Error', 'Failed to start camera');
    }
  };

  // Accept video call
  const acceptVideoCall = async () => {
    try {
      // Start InCallManager for audio routing (auto: false for manual speaker control)
      InCallManager.start({ media: 'video', auto: false });
      InCallManager.setForceSpeakerphoneOn(false); // Force earpiece mode
      setSpeakerEnabled(false);
      const stream = await webrtcManager.startVideo();
      setLocalStream(stream);
      setVideoMode('active');
      webrtcManager.acceptVideoInvite();
    } catch (error) {
      console.error('Failed to accept video:', error);
      InCallManager.stop();
      setVideoMode('idle');
      Alert.alert('Error', 'Failed to start camera');
    }
  };

  // Toggle fullscreen
  const toggleFullscreen = () => {
    if (videoMode === 'active') {
      setVideoMode('fullscreen');
    } else if (videoMode === 'fullscreen') {
      setVideoMode('active');
    }
  };

  // Show footer temporarily in fullscreen
  const showFooterTemporarily = () => {
    if (videoMode === 'fullscreen') {
      setFooterVisible(true);
      Animated.timing(footerOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();

      if (footerTimeoutRef.current) {
        clearTimeout(footerTimeoutRef.current);
      }
      footerTimeoutRef.current = setTimeout(() => {
        Animated.timing(footerOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start(() => setFooterVisible(false));
      }, 3000);
    }
  };

  const handleSendMessage = async () => {
    const trimmed = messageText.trim();
    if (!trimmed || isSending) return;

    // Dismiss keyboard immediately for better UX
    Keyboard.dismiss();

    try {
      await webrtcManager.sendMessage(trimmed);
      setMessageText('');
    } catch (error) {
      console.error('Failed to send message:', error);
      Alert.alert('Send Failed', 'Failed to send message');
    }
  };

  const handleToggleAudio = () => {
    const newState = !audioEnabled;
    setAudioEnabled(newState);
    webrtcManager.toggleAudio(newState);
  };

  const handleToggleVideo = () => {
    const newState = !videoEnabled;
    setVideoEnabled(newState);
    webrtcManager.toggleVideo(newState);
  };

  const handleToggleSpeaker = () => {
    const newState = !speakerEnabled;
    setSpeakerEnabled(newState);
    // Use setForceSpeakerphoneOn for reliable control:
    // true = loudspeaker (bottom), false = earpiece (top)
    InCallManager.setForceSpeakerphoneOn(newState);
  };

  const handleSwitchCamera = useCallback(async () => {
    if (isSwitchingCamera) return;

    setIsSwitchingCamera(true);
    try {
      const success = await webrtcManager.switchCamera();
      if (success) {
        setIsFrontCamera(prev => !prev);
      }
    } catch (error) {
      console.error('Failed to switch camera:', error);
    } finally {
      setIsSwitchingCamera(false);
    }
  }, [isSwitchingCamera]);

  // Stop video but keep text chat connected
  const handleStopVideo = () => {
    InCallManager.stop();
    webrtcManager.stopVideo();
    setVideoMode('idle');
    setLocalStream(null);
    setRemoteStream(null);
    setVideoEnabled(true);
    setAudioEnabled(true);
    setSpeakerEnabled(false);
    setIsFrontCamera(true);  // Reset to front camera for next video call
  };

  const formatTime = (seconds: number | null): string => {
    if (seconds === null || seconds < 0) return '--:--';

    const THREE_HOURS = 3 * 60 * 60; // 10800 seconds

    if (seconds > THREE_HOURS) {
      // HH:MM:SS for times over 3 hours
      const hours = Math.floor(seconds / 3600);
      const mins = Math.floor((seconds % 3600) / 60);
      const secs = seconds % 60;
      return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    // MM:SS for times up to 3 hours
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const renderMessage = (message: Message) => {
    const isOwnMessage = message.type === 'sent';
    const timeText = new Date(message.timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    }) + (message.status === 'sending' ? ' • Sending...' : '')
       + (message.status === 'failed' ? ' • Failed' : '');

    return (
      <View
        key={message.id}
        style={[
          styles.messageBubble,
          isOwnMessage ? styles.ownMessage : styles.otherMessage,
        ]}
      >
        <View style={styles.messageContent}>
          <Text
            style={[
              styles.messageText,
              isOwnMessage ? styles.ownMessageText : styles.otherMessageText,
            ]}
          >
            {message.content}
          </Text>
          <Text
            style={[
              styles.messageTime,
              isOwnMessage ? styles.ownMessageTime : styles.otherMessageTime,
            ]}
          >
            {timeText}
          </Text>
        </View>
      </View>
    );
  };

  const isVideoActive = videoMode === 'active' || videoMode === 'fullscreen';
  const showRemoteVideo = isVideoActive && remoteStream;

  // In fullscreen mode, don't respect bottom safe area to use full screen
  const safeAreaEdges = videoMode === 'fullscreen' ? ['top'] : ['top', 'bottom'];

  return (
    <SafeAreaView style={styles.container} edges={safeAreaEdges as any}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {/* Header - transparent overlay when video is active */}
        {!isVideoActive && (
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <StatusDot
                status={isConnected ? 'connected' : 'waiting'}
                style={styles.statusDot}
              />
              <Text style={styles.headerTitle}>
                {isConnected ? 'Connected' : 'Waiting for peer...'}
              </Text>
            </View>
            <Text style={styles.timer}>{formatTime(displayTime)}</Text>
          </View>
        )}

        {/* Main Content Area */}
        <View style={styles.mainContent}>
          {/* Transparent header overlay for video mode */}
          {isVideoActive && (
            <View style={styles.headerOverlay}>
              <View style={styles.headerLeft}>
                <StatusDot
                  status={isConnected ? 'connected' : 'waiting'}
                  style={styles.statusDot}
                />
                <Text style={styles.headerTitleOverlay}>
                  {isConnected ? 'Connected' : 'Waiting...'}
                </Text>
              </View>
              <Text style={styles.timerOverlay}>{formatTime(displayTime)}</Text>
            </View>
          )}
          {/* Remote Video (top half when active, fullscreen when fullscreen) */}
          {showRemoteVideo && (
            <TouchableOpacity
              style={[
                styles.remoteVideoContainer,
                videoMode === 'fullscreen' && styles.remoteVideoFullscreen,
              ]}
              activeOpacity={1}
              onPress={showFooterTemporarily}
            >
              <RTCView
                key={remoteStream.toURL()}  // Force re-mount on stream change
                streamURL={remoteStream.toURL()}
                style={styles.remoteVideo}
                objectFit="cover"
              />

              {/* Fullscreen toggle button */}
              <TouchableOpacity
                style={styles.fullscreenButton}
                onPress={toggleFullscreen}
              >
                <Ionicons
                  name={videoMode === 'fullscreen' ? 'contract' : 'expand'}
                  size={24}
                  color={COLORS.text.primary}
                />
              </TouchableOpacity>
            </TouchableOpacity>
          )}

          {/* Chat Section (hidden in fullscreen mode) */}
          {videoMode !== 'fullscreen' && (
            <View style={[
              styles.chatSection,
              !showRemoteVideo && styles.chatSectionFull,
            ]}>
              {/* Video invite button (when idle and connected) */}
              {videoMode === 'idle' && isConnected && (
                <TouchableOpacity
                  style={styles.videoInviteButton}
                  onPress={startVideoCall}
                >
                  <Ionicons name="videocam" size={24} color={COLORS.text.primary} />
                </TouchableOpacity>
              )}

              {/* Inviting indicator */}
              {videoMode === 'inviting' && (
                <View style={styles.invitingBadge}>
                  <Ionicons name="videocam" size={16} color={COLORS.accent.yellow} />
                  <Text style={styles.invitingText}>Calling...</Text>
                </View>
              )}

              {/* Messages */}
              <ScrollView
                ref={scrollViewRef}
                style={styles.messagesContainer}
                contentContainerStyle={styles.messagesContent}
              >
                {messages.length === 0 ? (
                  <Text style={styles.emptyText}>
                    {isConnected
                      ? 'Start typing to chat...'
                      : 'Waiting for the other participant to join...'}
                  </Text>
                ) : (
                  messages.map(renderMessage)
                )}
              </ScrollView>

              {/* Message Input */}
              <View style={styles.inputContainer}>
                <Input
                  value={messageText}
                  onChangeText={setMessageText}
                  placeholder="Type a message..."
                  onSubmitEditing={handleSendMessage}
                  returnKeyType="send"
                  style={styles.messageInput}
                  containerStyle={styles.messageInputContainer}
                />
                <Button
                  onPress={handleSendMessage}
                  disabled={!messageText.trim() || isSending}
                  loading={isSending}
                  style={styles.sendButton}
                >
                  <Ionicons name="send" size={20} color={COLORS.text.onAccent} />
                </Button>
              </View>
            </View>
          )}

          {/* Draggable Local Video (when video is active) */}
          {isVideoActive && localStream && (
            <Animated.View
              style={[
                styles.localVideoContainer,
                { transform: pan.getTranslateTransform() },
              ]}
              {...panResponder.panHandlers}
            >
              <RTCView
                streamURL={localStream.toURL()}
                style={styles.localVideo}
                objectFit="cover"
                mirror={isFrontCamera}
              />
            </Animated.View>
          )}
        </View>

        {/* Controls (auto-hide in fullscreen) */}
        {(footerVisible || videoMode !== 'fullscreen') && (
          <Animated.View style={[styles.controls, { opacity: footerOpacity }]}>
            {/* End session button - always on left */}
            <Button
              variant="danger"
              onPress={handleEndSession}
              style={styles.controlButton}
            >
              <Ionicons
                name="exit-outline"
                size={24}
                color={COLORS.text.primary}
              />
            </Button>

            {/* Video controls - only when video active */}
            {isVideoActive && (
              <View style={styles.videoControls}>
                <Button
                  variant={speakerEnabled ? 'primary' : 'secondary'}
                  onPress={handleToggleSpeaker}
                  style={styles.controlButton}
                >
                  <Ionicons
                    name={speakerEnabled ? 'volume-high' : 'volume-low'}
                    size={24}
                    color={speakerEnabled ? COLORS.text.onAccent : COLORS.text.primary}
                  />
                </Button>

                <Button
                  variant="secondary"
                  onPress={handleSwitchCamera}
                  style={[styles.controlButton, isSwitchingCamera && styles.controlButtonDisabled]}
                  disabled={isSwitchingCamera}
                >
                  <Ionicons
                    name="camera-reverse"
                    size={24}
                    color={COLORS.text.primary}
                  />
                </Button>

                <Button
                  variant={audioEnabled ? 'secondary' : 'danger'}
                  onPress={handleToggleAudio}
                  style={styles.controlButton}
                >
                  <Ionicons
                    name={audioEnabled ? 'mic' : 'mic-off'}
                    size={24}
                    color={COLORS.text.primary}
                  />
                </Button>

                <Button
                  variant={videoEnabled ? 'secondary' : 'danger'}
                  onPress={handleToggleVideo}
                  style={styles.controlButton}
                >
                  <Ionicons
                    name={videoEnabled ? 'videocam' : 'videocam-off'}
                    size={24}
                    color={COLORS.text.primary}
                  />
                </Button>

                {/* Stop video call (keep text chat) */}
                <Button
                  variant="danger"
                  onPress={handleStopVideo}
                  style={styles.controlButton}
                >
                  <Ionicons
                    name="call"
                    size={24}
                    color={COLORS.text.primary}
                  />
                </Button>
              </View>
            )}
          </Animated.View>
        )}

        {/* End Session Confirmation Modal */}
        <Modal
          visible={showEndConfirmModal}
          transparent
          animationType="fade"
          onRequestClose={handleCancelEndSession}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalIconContainer}>
                <Ionicons name="warning" size={64} color={COLORS.status.error} />
              </View>
              <Text style={styles.modalTitle}>End Session?</Text>
              <Text style={styles.modalMessage}>
                Are you sure you want to end this session? The token will be decommissioned and cannot be reused.
              </Text>
              <View style={styles.modalButtonRow}>
                <Button
                  onPress={handleCancelEndSession}
                  variant="secondary"
                  style={styles.modalButtonHalf}
                >
                  Cancel
                </Button>
                <Button
                  onPress={handleConfirmEndSession}
                  variant="danger"
                  style={styles.modalButtonHalf}
                >
                  Confirm
                </Button>
              </View>
            </View>
          </View>
        </Modal>

        {/* Session Ended Modal */}
        <Modal
          visible={showSessionEndedModal}
          transparent
          animationType="fade"
          onRequestClose={handleSessionEndedDismiss}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalIconContainer}>
                <Ionicons name="checkmark-circle" size={64} color={COLORS.accent.yellow} />
              </View>
              <Text style={styles.modalTitle}>Session Ended</Text>
              <Text style={styles.modalMessage}>
                The other participant has ended the session.
              </Text>
              <Button
                onPress={handleSessionEndedDismiss}
                fullWidth
                style={styles.modalButton}
              >
                Return to Home
              </Button>
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background.primary,
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.background.secondary,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border.default,
  },
  headerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    paddingTop: SPACING.md,
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
    zIndex: 100,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    marginRight: SPACING.sm,
  },
  headerTitle: {
    ...TEXT_STYLES.bodyMedium,
    color: COLORS.text.primary,
  },
  headerTitleOverlay: {
    ...TEXT_STYLES.bodyMedium,
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  timer: {
    ...TEXT_STYLES.caption,
    color: COLORS.accent.yellow,
    fontVariant: ['tabular-nums'],
  },
  timerOverlay: {
    ...TEXT_STYLES.caption,
    color: COLORS.accent.yellow,
    fontVariant: ['tabular-nums'],
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  mainContent: {
    flex: 1,
    position: 'relative',
  },
  remoteVideoContainer: {
    height: '50%',
    backgroundColor: COLORS.background.tertiary,
    position: 'relative',
  },
  remoteVideoFullscreen: {
    height: '100%',
  },
  remoteVideo: {
    width: '100%',
    height: '100%',
  },
  fullscreenButton: {
    position: 'absolute',
    top: SPACING.md + SPACING.xxxl,
    right: SPACING.md,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.overlay.dark,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatSection: {
    flex: 1,
    backgroundColor: COLORS.background.secondary,
    position: 'relative',
  },
  chatSectionFull: {
    height: '100%',
  },
  videoInviteButton: {
    position: 'absolute',
    top: SPACING.md,
    right: SPACING.md,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.accent.yellow,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  invitingBadge: {
    position: 'absolute',
    top: SPACING.md,
    right: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.background.tertiary,
    zIndex: 10,
  },
  invitingText: {
    ...TEXT_STYLES.caption,
    color: COLORS.accent.yellow,
    marginLeft: SPACING.xs,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: SPACING.md,
    paddingTop: SPACING.xl + SPACING.lg, // Space for floating button
  },
  emptyText: {
    ...TEXT_STYLES.body,
    color: COLORS.text.disabled,
    textAlign: 'center',
    marginTop: SPACING.xl,
  },
  messageBubble: {
    width: '80%',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.sm,
  },
  messageContent: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  ownMessage: {
    alignSelf: 'flex-end',
    backgroundColor: COLORS.accent.yellow,
  },
  otherMessage: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.background.tertiary,
  },
  messageText: {
    ...TEXT_STYLES.body,
    flexShrink: 1,
  },
  ownMessageText: {
    color: COLORS.background.primary,
  },
  otherMessageText: {
    color: COLORS.text.primary,
  },
  messageTime: {
    ...TEXT_STYLES.caption,
    fontSize: Math.max(9, (TEXT_STYLES.caption.fontSize || 12) * 0.7),
    marginLeft: SPACING.sm,
  },
  ownMessageTime: {
    color: COLORS.background.primary,
    opacity: 0.7,
  },
  otherMessageTime: {
    color: COLORS.text.disabled,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: SPACING.md,
    backgroundColor: COLORS.background.secondary,
    borderTopWidth: 1,
    borderTopColor: COLORS.border.default,
    alignItems: 'flex-end',
  },
  messageInputContainer: {
    flex: 1,
    marginRight: SPACING.sm,
  },
  messageInput: {
    minHeight: 40,
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    paddingHorizontal: 0,
  },
  localVideoContainer: {
    position: 'absolute',
    width: LOCAL_VIDEO_WIDTH,
    height: LOCAL_VIDEO_HEIGHT,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: COLORS.accent.yellow,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  localVideo: {
    width: '100%',
    height: '100%',
  },
  controls: {
    flexDirection: 'row',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    backgroundColor: COLORS.background.secondary,
    borderTopWidth: 1,
    borderTopColor: COLORS.border.default,
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  controlButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 0,
  },
  controlButtonDisabled: {
    opacity: 0.5,
  },
  videoControls: {
    flexDirection: 'row',
    marginLeft: 'auto',
    gap: SPACING.sm,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  modalContent: {
    backgroundColor: COLORS.background.secondary,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
  },
  modalIconContainer: {
    marginBottom: SPACING.lg,
  },
  modalTitle: {
    ...TEXT_STYLES.h2,
    color: COLORS.text.primary,
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  modalMessage: {
    ...TEXT_STYLES.body,
    color: COLORS.text.secondary,
    textAlign: 'center',
    marginBottom: SPACING.xl,
  },
  modalButton: {
    marginTop: SPACING.md,
  },
  modalButtonRow: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginTop: SPACING.md,
  },
  modalButtonHalf: {
    flex: 1,
  },
});
