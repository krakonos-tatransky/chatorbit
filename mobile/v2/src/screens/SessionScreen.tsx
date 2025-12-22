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
  type GestureResponderEvent,
  type PanResponderGestureState,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RTCView } from 'react-native-webrtc';
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
  Landing: undefined;
  Accept: undefined;
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

  // Footer visibility for fullscreen mode
  const [footerVisible, setFooterVisible] = useState(true);
  const footerOpacity = useRef(new Animated.Value(1)).current;

  // Session ended modal
  const [showSessionEndedModal, setShowSessionEndedModal] = useState(false);

  // Draggable local video position
  const pan = useRef(new Animated.ValueXY({ x: SCREEN_WIDTH - LOCAL_VIDEO_WIDTH - SPACING.md, y: SPACING.md })).current;

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

  // End session and show modal
  const endSessionWithModal = useCallback(async () => {
    try {
      await webrtcManager.endSession();
      await useSessionStore.getState().endSession();
      setShowSessionEndedModal(true);
    } catch (error) {
      console.error('Failed to end session:', error);
      setShowSessionEndedModal(true);
    }
  }, []);

  // Handle modal dismiss - navigate to Landing
  const handleSessionEndedDismiss = useCallback(() => {
    setShowSessionEndedModal(false);
    navigation.reset({
      index: 0,
      routes: [{ name: 'Landing' }],
    });
  }, [navigation]);

  // End session with confirmation
  const handleEndSession = useCallback(() => {
    Alert.alert(
      'End Session',
      'Are you sure you want to end this session? The token will be decommissioned.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'End Session', style: 'destructive', onPress: endSessionWithModal },
      ]
    );
  }, [endSessionWithModal]);

  // Initialize signaling connection (no video yet)
  useEffect(() => {
    if (!token || !participantId) {
      Alert.alert('Error', 'No session token or participant ID');
      navigation.navigate('Accept');
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
          { text: 'Decline', style: 'cancel', onPress: () => setVideoMode('idle') },
          { text: 'Accept', onPress: acceptVideoCall },
        ]
      );
    };

    // Listen for remote stream
    const checkRemoteStream = setInterval(() => {
      const remote = webrtcManager.getRemoteStream();
      if (remote) {
        setRemoteStream(remote);
        if (videoMode === 'inviting' || videoMode === 'invited') {
          setVideoMode('active');
        }
      }
    }, 500);

    webrtcManager.onVideoInvite = handleVideoInvite;

    return () => {
      clearInterval(checkRemoteStream);
      webrtcManager.onVideoInvite = undefined;
    };
  }, [token, participantId, isHost, navigation, videoMode]);

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
        endSessionWithModal();
      }
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [sessionExpiresAt, endSessionWithModal]);

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
      const stream = await webrtcManager.startVideo();
      setLocalStream(stream);
      webrtcManager.sendVideoInvite();
    } catch (error) {
      console.error('Failed to start video:', error);
      setVideoMode('idle');
      Alert.alert('Error', 'Failed to start camera');
    }
  };

  // Accept video call
  const acceptVideoCall = async () => {
    try {
      const stream = await webrtcManager.startVideo();
      setLocalStream(stream);
      setVideoMode('active');
      webrtcManager.acceptVideoInvite();
    } catch (error) {
      console.error('Failed to accept video:', error);
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

  const formatTime = (seconds: number | null): string => {
    if (seconds === null || seconds < 0) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const renderMessage = (message: Message) => {
    const isOwnMessage = message.type === 'sent';
    return (
      <View
        key={message.id}
        style={[
          styles.messageBubble,
          isOwnMessage ? styles.ownMessage : styles.otherMessage,
        ]}
      >
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
          {new Date(message.timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
          {message.status === 'sending' && ' • Sending...'}
          {message.status === 'failed' && ' • Failed'}
        </Text>
      </View>
    );
  };

  const isVideoActive = videoMode === 'active' || videoMode === 'fullscreen';
  const showRemoteVideo = isVideoActive && remoteStream;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {/* Header */}
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

        {/* Main Content Area */}
        <View style={styles.mainContent}>
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
                mirror={true}
              />
            </Animated.View>
          )}
        </View>

        {/* Controls (auto-hide in fullscreen) */}
        {(footerVisible || videoMode !== 'fullscreen') && (
          <Animated.View style={[styles.controls, { opacity: footerOpacity }]}>
            {isVideoActive ? (
              <>
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

                <Button
                  variant="danger"
                  onPress={handleEndSession}
                  style={styles.controlButton}
                >
                  <Ionicons
                    name="call"
                    size={24}
                    color={COLORS.text.primary}
                    style={{ transform: [{ rotate: '135deg' }] }}
                  />
                </Button>
              </>
            ) : (
              <Button
                variant="danger"
                onPress={handleEndSession}
                style={styles.controlButtonWide}
              >
                Leave Session
              </Button>
            )}
          </Animated.View>
        )}

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
                This session has been closed and the token is no longer valid.
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
  timer: {
    ...TEXT_STYLES.h3,
    color: COLORS.accent.yellow,
    fontVariant: ['tabular-nums'],
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
    top: SPACING.md,
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
    maxWidth: '80%',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.sm,
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
  },
  ownMessageText: {
    color: COLORS.background.primary,
  },
  otherMessageText: {
    color: COLORS.text.primary,
  },
  messageTime: {
    ...TEXT_STYLES.caption,
    marginTop: SPACING.xs,
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
    paddingHorizontal: SPACING.xl,
    backgroundColor: COLORS.background.secondary,
    borderTopWidth: 1,
    borderTopColor: COLORS.border.default,
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  controlButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 0,
  },
  controlButtonWide: {
    flex: 1,
    marginHorizontal: SPACING.xl,
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
});
