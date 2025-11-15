import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
  Modal,
  SafeAreaView,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import * as Clipboard from 'expo-clipboard';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { useFonts } from 'expo-font';

const COLORS = {
  midnight: '#020B1F',
  abyss: '#041335',
  deepBlue: '#06255E',
  ocean: '#0A4A89',
  lagoon: '#0F6FBA',
  aurora: '#6FE7FF',
  ice: '#F4F9FF',
  mint: '#88E6FF',
  white: '#FFFFFF',
  glowSoft: 'rgba(4, 23, 60, 0.96)',
  glowWarm: 'rgba(9, 54, 120, 0.88)',
  glowEdge: 'rgba(111, 214, 255, 0.55)',
  cobaltShadow: 'rgba(3, 20, 46, 0.6)',
  danger: '#EF476F'
};

const API_BASE_URL = 'https://endpoints.chatorbit.com/api';
const MOBILE_CLIENT_IDENTITY = 'mobile-app-host';

const TERMS_TEXT = `Welcome to ChatOrbit!\n\nBefore generating secure session tokens, please take a moment to review these highlights:\n\n• Tokens are valid only for the duration selected during creation.\n• Share your token only with trusted participants.\n• Generated sessions may be monitored for quality and abuse prevention.\n• Using the token implies that you agree to abide by ChatOrbit community guidelines.\n\nThis preview app is designed for rapid testing of the ChatOrbit realtime experience. By continuing you acknowledge that:\n\n1. You are authorised to request access tokens on behalf of your organisation or team.\n2. All interactions facilitated by the token must respect local regulations regarding recorded communication.\n3. ChatOrbit may contact you for product feedback using the email or account associated with your workspace.\n4. Abuse of the system, including sharing illicit content, will result in automatic suspension of the workspace.\n\nScroll to the bottom of this message to enable the Accept button. Thank you for helping us keep the orbit safe and collaborative!`;

type DurationOption = {
  label: string;
  value: string;
};

type TokenTierOption = {
  label: string;
  value: string;
};

type TokenResponse = {
  token: string;
  validity_expires_at: string;
  session_ttl_seconds: number;
  message_char_limit: number;
  created_at: string;
};

type JoinResponse = {
  token: string;
  participant_id: string;
  role: string;
  session_active: boolean;
  session_started_at: string | null;
  session_expires_at: string | null;
  message_char_limit: number;
};

type ValidityOption = {
  label: string;
  value: '1_day' | '1_week' | '1_month' | '1_year';
};

const durationOptions: DurationOption[] = [
  { label: '15 minutes', value: '15m' },
  { label: '30 minutes', value: '30m' },
  { label: '1 hour', value: '1h' },
  { label: '4 hours', value: '4h' }
];

const tokenTierOptions: TokenTierOption[] = [
  { label: 'Standard Session', value: 'standard' },
  { label: 'Premium Session', value: 'premium' }
];

const validityOptions: ValidityOption[] = [
  { label: 'Valid for 1 day', value: '1_day' },
  { label: 'Valid for 1 week', value: '1_week' },
  { label: 'Valid for 1 month', value: '1_month' },
  { label: 'Valid for 1 year', value: '1_year' }
];

const SESSION_TTL_MINUTES: Record<string, number> = {
  '15m': 15,
  '30m': 30,
  '1h': 60,
  '4h': 240
};

const DEFAULT_MESSAGE_CHAR_LIMIT = 2000;

type SessionParticipant = {
  participant_id: string;
  role: string;
  joined_at: string;
};

type SessionStatus = {
  token: string;
  status: string;
  validity_expires_at: string;
  session_started_at: string | null;
  session_expires_at: string | null;
  message_char_limit: number;
  participants: SessionParticipant[];
  remaining_seconds: number | null;
};

type SessionStatusSocketPayload = SessionStatus & {
  type: string;
  connected_participants?: string[];
};

type ChatMessage = {
  id: string;
  sender: 'self' | 'peer' | 'system';
  body: string;
  timestamp: number;
};

const SESSION_POLL_INTERVAL_MS = 12000;

const extractFriendlyError = (rawBody: string): string => {
  if (!rawBody) {
    return 'Unexpected response from the server.';
  }

  try {
    const parsed = JSON.parse(rawBody);
    if (typeof parsed?.detail === 'string') {
      return parsed.detail;
    }
    if (Array.isArray(parsed?.detail)) {
      const combined = parsed.detail
        .map((item: any) => (typeof item?.msg === 'string' ? item.msg : null))
        .filter(Boolean)
        .join('\n');
      if (combined) {
        return combined;
      }
    }
  } catch {
    // Swallow JSON parsing issues and fall back to the raw payload below.
  }

  return rawBody;
};

const joinSession = async (
  tokenValue: string,
  existingParticipantId?: string | null
): Promise<JoinResponse> => {
  const trimmedToken = tokenValue.trim();
  const response = await fetch(`${API_BASE_URL}/sessions/join`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      token: trimmedToken,
      participant_id: existingParticipantId ?? undefined,
      client_identity: MOBILE_CLIENT_IDENTITY
    })
  });

  const rawBody = await response.text();

  if (!response.ok) {
    throw new Error(extractFriendlyError(rawBody) || 'Unable to join the session.');
  }

  try {
    const payload = JSON.parse(rawBody) as JoinResponse;
    if (!payload?.participant_id || !payload?.token) {
      throw new Error('Missing participant details in the join response.');
    }
    return payload;
  } catch (error: any) {
    if (error instanceof Error && error.message === 'Missing participant details in the join response.') {
      throw error;
    }
    throw new Error('Received an unexpected response from the session join API.');
  }
};

const fetchSessionStatus = async (
  tokenValue: string,
  signal?: AbortSignal
): Promise<SessionStatus> => {
  const response = await fetch(`${API_BASE_URL}/sessions/${encodeURIComponent(tokenValue)}/status`, {
    method: 'GET',
    signal
  });

  const rawBody = await response.text();

  if (!response.ok) {
    throw new Error(extractFriendlyError(rawBody) || 'Unable to load the session status.');
  }

  try {
    return JSON.parse(rawBody) as SessionStatus;
  } catch (error) {
    console.error('Failed to parse session status payload', error);
    throw new Error('Received an invalid session status payload.');
  }
};

const createMessageId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const formatRemainingTime = (seconds: number | null) => {
  if (seconds == null) {
    return 'Session will begin once a guest joins.';
  }
  if (seconds <= 0) {
    return 'Session timer elapsed.';
  }
  const rounded = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(rounded / 3600);
  const minutes = Math.floor((rounded % 3600) / 60);
  const secs = rounded % 60;
  if (hours > 0) {
    return `${hours}h ${minutes.toString().padStart(2, '0')}m remaining`;
  }
  return `${minutes}m ${secs.toString().padStart(2, '0')}s remaining`;
};

const formatJoinedAt = (isoString: string) => {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) {
    return 'Joined time unavailable';
  }
  return `Joined ${date.toLocaleString()}`;
};

const mapStatusLabel = (status: string | undefined) => {
  switch (status) {
    case 'active':
      return 'Active';
    case 'issued':
      return 'Waiting';
    case 'closed':
      return 'Closed';
    case 'expired':
      return 'Expired';
    case 'deleted':
      return 'Deleted';
    default:
      return 'Unknown';
  }
};

const mapStatusDescription = (status: string | undefined) => {
  switch (status) {
    case 'active':
      return 'Both participants are connected to the live session.';
    case 'issued':
      return 'Share the token with your guest to begin the session.';
    case 'closed':
      return 'This session has been closed.';
    case 'expired':
      return 'This session expired before both participants connected.';
    case 'deleted':
      return 'This session is no longer available.';
    default:
      return 'Session status is being determined.';
  }
};

const statusVariant = (status: string | undefined) => {
  switch (status) {
    case 'active':
      return 'success';
    case 'issued':
      return 'waiting';
    default:
      return 'inactive';
  }
};

const AcceptScreen: React.FC<{ onAccept: () => void }> = ({ onAccept }) => {
  const [acceptEnabled, setAcceptEnabled] = useState(false);

  const handleScroll = (event: any) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const distanceFromBottom = contentSize.height - (contentOffset.y + layoutMeasurement.height);
    if (distanceFromBottom <= 24) {
      setAcceptEnabled(true);
    }
  };

  return (
    <LinearGradient
      colors={[COLORS.midnight, COLORS.deepBlue, COLORS.ocean, COLORS.lagoon]}
      start={{ x: 0.1, y: 0 }}
      end={{ x: 0.9, y: 1 }}
      style={styles.container}
    >
      <StatusBar style="light" />
      <LinearGradient
        colors={[COLORS.glowSoft, COLORS.glowWarm, COLORS.glowSoft]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.termsCard}
      >
        <Text style={styles.logoText}>ChatOrbit Token Lab</Text>
        <ScrollView
          style={styles.termsScroll}
          contentContainerStyle={styles.termsContent}
          onScroll={handleScroll}
          scrollEventThrottle={24}
        >
          <Text style={styles.termsText}>{TERMS_TEXT}</Text>
        </ScrollView>
        <TouchableOpacity
          accessibilityRole="button"
          style={[styles.acceptButton, !acceptEnabled && styles.acceptButtonDisabled]}
          onPress={onAccept}
          disabled={!acceptEnabled}
        >
          <Text style={styles.acceptButtonLabel}>{acceptEnabled ? 'Accept & Continue' : 'Scroll to accept'}</Text>
        </TouchableOpacity>
      </LinearGradient>
    </LinearGradient>
  );
};

const BigActionButton: React.FC<{
  icon: React.ReactNode;
  title: string;
  description: string;
  onPress: () => void;
  background: string;
}> = ({ icon, title, description, onPress, background }) => {
  return (
    <TouchableOpacity style={[styles.bigActionButton, { backgroundColor: background }]} onPress={onPress}>
      <View style={styles.bigActionIcon}>{icon}</View>
      <View style={styles.bigActionTextContainer}>
        <Text style={styles.bigActionTitle}>{title}</Text>
        <Text style={styles.bigActionDescription}>{description}</Text>
      </View>
    </TouchableOpacity>
  );
};

const NeedTokenForm: React.FC<{
  visible: boolean;
  onClose: () => void;
  onGenerated: (token: TokenResponse) => void;
}> = ({ visible, onClose, onGenerated }) => {
  const [selectedDuration, setSelectedDuration] = useState(durationOptions[2].value);
  const [selectedTier, setSelectedTier] = useState(tokenTierOptions[0].value);
  const [selectedValidity, setSelectedValidity] = useState<ValidityOption['value']>(validityOptions[0].value);
  const [loading, setLoading] = useState(false);

  const requestToken = async () => {
    try {
      setLoading(true);
      const sessionTtlMinutes = SESSION_TTL_MINUTES[selectedDuration] ?? SESSION_TTL_MINUTES['1h'];
      const response = await fetch(`${API_BASE_URL}/tokens`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          validity_period: selectedValidity,
          session_ttl_minutes: sessionTtlMinutes,
          message_char_limit: DEFAULT_MESSAGE_CHAR_LIMIT,
          client_identity: `mobile-${selectedTier}`
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        let friendlyMessage = errorText || 'Failed to generate token';
        try {
          const parsed = JSON.parse(errorText);
          if (Array.isArray(parsed?.detail)) {
            friendlyMessage = parsed.detail.map((item: any) => item?.msg).filter(Boolean).join('\n');
          } else if (typeof parsed?.detail === 'string') {
            friendlyMessage = parsed.detail;
          }
        } catch {
          // Ignore JSON parsing errors and fall back to raw text.
        }
        throw new Error(friendlyMessage);
      }

      const data = (await response.json()) as TokenResponse;
      if (!data.token) {
        throw new Error('The API response did not include a token.');
      }
      onGenerated(data);
    } catch (error: any) {
      console.error('Token request failed', error);
      Alert.alert('Token error', error.message || 'Unable to generate token at this time.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={() => {
        if (!loading) {
          onClose();
        }
      }}
    >
      <LinearGradient
        colors={[COLORS.midnight, COLORS.deepBlue, COLORS.ocean, COLORS.lagoon]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={styles.formContainer}
      >
        <StatusBar style="light" />
        <SafeAreaView style={styles.formSafeArea}>
          <View style={styles.formHeader}>
            <Text style={styles.formTitle}>Need a token?</Text>
            <TouchableOpacity
              onPress={onClose}
              accessibilityRole="button"
              disabled={loading}
              style={[styles.formCloseButton, loading && styles.disabledClose]}
            >
              <Ionicons name="close" size={28} color={COLORS.ice} />
            </TouchableOpacity>
          </View>
          <ScrollView
            contentContainerStyle={styles.formContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.formSubtitle}>
              Set how long the live session runs, how long the token stays claimable, and the experience tier you need.
            </Text>
            <View style={styles.pickerGroup}>
              <Text style={styles.pickerLabel}>Session duration</Text>
              <View style={styles.pickerWrapper}>
                <Picker
                  selectedValue={selectedDuration}
                  onValueChange={(value) => setSelectedDuration(value.toString())}
                  dropdownIconColor={COLORS.aurora}
                  style={styles.picker}
                  itemStyle={styles.pickerItem}
                >
                  {durationOptions.map((option) => (
                    <Picker.Item key={option.value} label={option.label} value={option.value} />
                  ))}
                </Picker>
              </View>
            </View>
            <View style={styles.pickerGroup}>
              <Text style={styles.pickerLabel}>Validity window</Text>
              <View style={styles.pickerWrapper}>
                <Picker
                  selectedValue={selectedValidity}
                  onValueChange={(value) => setSelectedValidity(value as ValidityOption['value'])}
                  dropdownIconColor={COLORS.aurora}
                  style={styles.picker}
                  itemStyle={styles.pickerItem}
                >
                  {validityOptions.map((option) => (
                    <Picker.Item key={option.value} label={option.label} value={option.value} />
                  ))}
                </Picker>
              </View>
            </View>
            <View style={styles.pickerGroup}>
              <Text style={styles.pickerLabel}>Token tier</Text>
              <View style={styles.pickerWrapper}>
                <Picker
                  selectedValue={selectedTier}
                  onValueChange={(value) => setSelectedTier(value.toString())}
                  dropdownIconColor={COLORS.aurora}
                  style={styles.picker}
                  itemStyle={styles.pickerItem}
                >
                  {tokenTierOptions.map((option) => (
                    <Picker.Item key={option.value} label={option.label} value={option.value} />
                  ))}
                </Picker>
              </View>
            </View>
            <TouchableOpacity
              style={[styles.generateButton, loading && styles.generateButtonDisabled]}
              onPress={requestToken}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <Text style={styles.generateButtonLabel}>Generate token</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </LinearGradient>
    </Modal>
  );
};

const TokenResultCard: React.FC<{
  token: TokenResponse;
  onReset: () => void;
  onStartInApp: () => void | Promise<void>;
  joiningInApp: boolean;
}> = ({ token, onReset, onStartInApp, joiningInApp }) => {
  const shareMessage = useMemo(() => `Join my ChatOrbit session using this token: ${token.token}`, [token.token]);
  const sessionMinutes = Math.max(1, Math.round(token.session_ttl_seconds / 60));
  const messageLimit = token.message_char_limit.toLocaleString();
  const [launchingWeb, setLaunchingWeb] = useState(false);
  const [storedParticipantId, setStoredParticipantId] = useState<string | null>(null);

  const copyToClipboard = async () => {
    await Clipboard.setStringAsync(token.token);
    Alert.alert('Copied', 'Token copied to clipboard.');
  };

  const shareToken = async () => {
    try {
      await Share.share({ message: shareMessage });
    } catch (error: any) {
      Alert.alert('Unable to share', error?.message ?? 'Unexpected error while sharing token');
    }
  };

  const startSessionOnWeb = async () => {
    if (launchingWeb) {
      return;
    }

    try {
      setLaunchingWeb(true);
      const payload = await joinSession(token.token, storedParticipantId);
      const participantId = payload.participant_id;
      setStoredParticipantId(participantId);

      const canonicalToken = payload.token || token.token;
      const sessionUrl = `https://chatorbit.com/session/${encodeURIComponent(canonicalToken)}?participant=${encodeURIComponent(participantId)}`;
      const supported = await Linking.canOpenURL(sessionUrl);
      if (supported) {
        await Linking.openURL(sessionUrl);
      } else {
        throw new Error('Your device cannot open the ChatOrbit session URL.');
      }
    } catch (error: any) {
      Alert.alert('Cannot open session', error?.message ?? 'Unexpected error while launching the session.');
    } finally {
      setLaunchingWeb(false);
    }
  };

  return (
    <LinearGradient
      colors={[COLORS.glowSoft, COLORS.glowWarm, COLORS.glowSoft]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.resultCard}
    >
      <Text style={styles.resultTitle}>Your token is ready!</Text>
      <Text style={styles.tokenText}>{token.token}</Text>
      {token.validity_expires_at ? (
        <Text style={styles.expiryText}>
          Valid until {new Date(token.validity_expires_at).toLocaleString()}
        </Text>
      ) : null}
      <Text style={styles.resultMeta}>Session stays live for {sessionMinutes} minutes after everyone joins.</Text>
      <Text style={styles.resultMeta}>Messages are limited to {messageLimit} characters.</Text>
      <View style={styles.resultButtonRow}>
        <TouchableOpacity style={styles.resultButton} onPress={copyToClipboard}>
          <Ionicons name="copy-outline" size={20} color={COLORS.ice} />
          <Text style={styles.resultButtonLabel}>Copy</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.resultButton} onPress={shareToken}>
          <Ionicons name="share-outline" size={20} color={COLORS.ice} />
          <Text style={styles.resultButtonLabel}>Share</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.startSessionLabel}>Start session</Text>
      <View style={styles.sessionButtonsRow}>
        <TouchableOpacity
          style={[
            styles.resultButton,
            styles.primaryResultButton,
            joiningInApp && styles.primaryResultButtonDisabled
          ]}
          onPress={onStartInApp}
          disabled={joiningInApp}
        >
          {joiningInApp ? (
            <ActivityIndicator color={COLORS.midnight} />
          ) : (
            <MaterialCommunityIcons name="tablet-cellphone" size={20} color={COLORS.midnight} />
          )}
          <Text style={[styles.resultButtonLabel, styles.primaryResultButtonLabel]}>
            {joiningInApp ? 'Connecting…' : 'In app'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.resultButton,
            styles.primaryResultButton,
            launchingWeb && styles.primaryResultButtonDisabled
          ]}
          onPress={startSessionOnWeb}
          disabled={launchingWeb}
        >
          {launchingWeb ? (
            <ActivityIndicator color={COLORS.midnight} />
          ) : (
            <MaterialCommunityIcons name="rocket-launch-outline" size={20} color={COLORS.midnight} />
          )}
          <Text style={[styles.resultButtonLabel, styles.primaryResultButtonLabel]}>
            {launchingWeb ? 'Opening…' : 'On web'}
          </Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity style={styles.resetButton} onPress={onReset}>
        <Text style={styles.resetButtonLabel}>Generate another token</Text>
      </TouchableOpacity>
    </LinearGradient>
  );
};

const InAppSessionScreen: React.FC<{
  token: TokenResponse;
  participantId: string;
  onExit: () => void;
}> = ({ token, participantId, onExit }) => {
  const [sessionStatus, setSessionStatus] = useState<SessionStatus | null>(null);
  const [connectedParticipantIds, setConnectedParticipantIds] = useState<string[]>([]);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: createMessageId(),
      sender: 'system',
      body: 'Session cockpit ready. Waiting for participants to join the conversation.',
      timestamp: Date.now()
    }
  ]);
  const [draft, setDraft] = useState('');
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const messageListRef = useRef<FlatList<ChatMessage> | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const lastParticipantIdsRef = useRef<string[]>([]);

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();
    const loadStatus = async (showSpinner: boolean) => {
      if (showSpinner) {
        setStatusLoading(true);
        setStatusError(null);
      }
      try {
        const status = await fetchSessionStatus(token.token, controller.signal);
        if (isMounted) {
          setSessionStatus(status);
          setRemainingSeconds(status.remaining_seconds ?? null);
          lastParticipantIdsRef.current = status.participants.map((participant) => participant.participant_id);
          setConnectedParticipantIds((prev) => {
            if (!prev.length) {
              return prev;
            }
            const allowed = new Set(status.participants.map((participant) => participant.participant_id));
            return prev.filter((id) => allowed.has(id));
          });
          setStatusError(null);
        }
      } catch (error: any) {
        if (isMounted && !controller.signal.aborted) {
          setStatusError(error?.message ?? 'Unable to load the session status.');
        }
      } finally {
        if (isMounted && showSpinner) {
          setStatusLoading(false);
        }
      }
    };
    loadStatus(true);

    const interval = setInterval(() => {
      loadStatus(false);
    }, SESSION_POLL_INTERVAL_MS);

    return () => {
      isMounted = false;
      controller.abort();
      clearInterval(interval);
    };
  }, [token.token]);

  useEffect(() => {
    if (!participantId) {
      return;
    }

    const url = `wss://endpoints.chatorbit.com/ws/sessions/${encodeURIComponent(token.token)}?participantId=${encodeURIComponent(participantId)}`;
    let closedByEffect = false;
    let socket: WebSocket | null = null;

    try {
      socket = new WebSocket(url);
      socketRef.current = socket;
    } catch (error) {
      console.warn('Unable to open realtime session socket', error);
      setStatusError('Unable to open realtime connection. Some updates may be delayed.');
      return;
    }

    socket.onopen = () => {
      setStatusError(null);
    };

    socket.onerror = () => {
      setStatusError('Realtime connection interrupted. Attempting to reconnect…');
    };

    socket.onclose = () => {
      socketRef.current = null;
      if (!closedByEffect) {
        setStatusError((prev) => prev ?? 'Realtime connection closed.');
      }
    };

    socket.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as SessionStatusSocketPayload | { type: string };
        if (payload.type === 'status') {
          const { connected_participants, type: _ignoredType, ...rest } = payload as SessionStatusSocketPayload;
          setSessionStatus(rest);
          setRemainingSeconds(rest.remaining_seconds ?? null);
          setConnectedParticipantIds(Array.isArray(connected_participants) ? connected_participants : []);
          if (statusLoading) {
            setStatusLoading(false);
          }
        } else if (payload.type === 'session_closed') {
          setStatusError('The session has been closed.');
        } else if (payload.type === 'session_expired') {
          setStatusError('The session has expired.');
        } else if (payload.type === 'session_deleted') {
          setStatusError('The session is no longer available.');
        }
      } catch (error) {
        console.warn('Unable to process websocket payload', error);
      }
    };

    return () => {
      closedByEffect = true;
      if (socketRef.current) {
        try {
          socketRef.current.close();
        } catch (error) {
          console.warn('Failed to close session socket', error);
        }
      }
      socketRef.current = null;
    };
  }, [participantId, token.token]);

  useEffect(() => {
    if (sessionStatus) {
      const nextRemaining = sessionStatus.remaining_seconds ?? null;
      setRemainingSeconds(nextRemaining);
    }
  }, [sessionStatus?.remaining_seconds]);

  useEffect(() => {
    if (remainingSeconds == null) {
      return;
    }
    if (remainingSeconds <= 0) {
      return;
    }
    const timeout = setTimeout(() => {
      setRemainingSeconds((prev) => (prev == null || prev <= 0 ? prev : prev - 1));
    }, 1000);
    return () => clearTimeout(timeout);
  }, [remainingSeconds]);

  useEffect(() => {
    if (!sessionStatus) {
      return;
    }
    const currentIds = sessionStatus.participants.map((participant) => participant.participant_id);
    const previousIds = lastParticipantIdsRef.current;
    if (previousIds.length === 0) {
      lastParticipantIdsRef.current = currentIds;
      return;
    }
    const newlyJoined = sessionStatus.participants.filter(
      (participant) => !previousIds.includes(participant.participant_id)
    );
    if (newlyJoined.length > 0) {
      setMessages((prev) => [
        ...prev,
        ...newlyJoined.map((participant) => ({
          id: createMessageId(),
          sender: 'system',
          body: `${participant.role === 'host' ? 'Host' : 'Guest'} joined the session.`,
          timestamp: Date.now()
        }))
      ]);
    }
    lastParticipantIdsRef.current = currentIds;
  }, [sessionStatus]);

  useEffect(() => {
    if (!messageListRef.current) {
      return;
    }
    messageListRef.current.scrollToEnd({ animated: true });
  }, [messages]);

  const handleSendMessage = () => {
    const trimmed = draft.trim();
    if (!trimmed) {
      return;
    }
    if (sessionStatus?.message_char_limit && trimmed.length > sessionStatus.message_char_limit) {
      Alert.alert('Message too long', `Messages are limited to ${sessionStatus.message_char_limit} characters.`);
      return;
    }
    const nextMessage: ChatMessage = {
      id: createMessageId(),
      sender: 'self',
      body: trimmed,
      timestamp: Date.now()
    };
    setMessages((prev) => [...prev, nextMessage]);
    setDraft('');
  };

  const sessionStatusLabel = mapStatusLabel(sessionStatus?.status);
  const sessionStatusDescription = mapStatusDescription(sessionStatus?.status);
  const statusIndicatorVariant = statusVariant(sessionStatus?.status);
  const messageLimit = sessionStatus?.message_char_limit ?? token.message_char_limit ?? DEFAULT_MESSAGE_CHAR_LIMIT;
  const canSendMessage = sessionStatus?.status === 'active';
  const sendDisabled = !canSendMessage || !draft.trim();
  const connectedCount = connectedParticipantIds.length;
  const participants = sessionStatus?.participants ?? [];

  return (
    <LinearGradient
      colors={[COLORS.glowSoft, COLORS.glowWarm, COLORS.glowSoft]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.inAppSessionContainer}
    >
      <SafeAreaView style={styles.inAppSessionSafeArea}>
        <View style={styles.inAppHeaderRow}>
          <TouchableOpacity accessibilityRole="button" style={styles.inAppBackButton} onPress={onExit}>
            <Ionicons name="arrow-back" size={20} color={COLORS.ice} />
            <Text style={styles.inAppBackLabel}>Back</Text>
          </TouchableOpacity>
          <View style={styles.inAppHeaderTextGroup}>
            <Text style={styles.inAppTitle}>Live session cockpit</Text>
            <Text style={styles.inAppSubtitle}>Keep this screen open while participants join.</Text>
          </View>
        </View>
        <ScrollView
          style={styles.sessionScrollContainer}
          contentContainerStyle={styles.sessionScrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.sessionStatusCard}>
            <View style={styles.sessionCardHeader}>
              <Text style={styles.sessionCardTitle}>Session status</Text>
              <View
                style={[
                  styles.statusPill,
                  statusIndicatorVariant === 'success'
                    ? styles.statusPillSuccess
                    : statusIndicatorVariant === 'waiting'
                      ? styles.statusPillWaiting
                      : styles.statusPillInactive
                ]}
              >
                <View style={styles.statusPillIndicator} />
                <Text style={styles.statusPillLabel}>{sessionStatusLabel}</Text>
              </View>
            </View>
            <Text style={styles.sessionCardDescription}>{sessionStatusDescription}</Text>
            {statusLoading ? (
              <View style={styles.statusLoadingRow}>
                <ActivityIndicator color={COLORS.aurora} />
                <Text style={styles.statusLoadingLabel}>Loading session details…</Text>
              </View>
            ) : statusError ? (
              <View style={styles.statusErrorBanner}>
                <Ionicons name="alert-circle" size={18} color={COLORS.danger} />
                <Text style={styles.statusErrorLabel}>{statusError}</Text>
              </View>
            ) : (
              <View style={styles.statusMetricsContainer}>
                <View style={styles.statusMetricRow}>
                  <Text style={styles.statusMetricLabel}>Timer</Text>
                  <Text style={styles.statusMetricValue}>{formatRemainingTime(remainingSeconds)}</Text>
                </View>
                <View style={styles.statusMetricRow}>
                  <Text style={styles.statusMetricLabel}>Message limit</Text>
                  <Text style={styles.statusMetricValue}>{messageLimit.toLocaleString()} characters</Text>
                </View>
                <View style={styles.statusMetricRow}>
                  <Text style={styles.statusMetricLabel}>Connected</Text>
                  <Text style={styles.statusMetricValue}>
                    {connectedCount}/{Math.max(participants.length, 2)} participants
                  </Text>
                </View>
                <View style={styles.participantList}>
                  {participants.length === 0 ? (
                    <Text style={styles.participantEmpty}>Waiting for participants to join…</Text>
                  ) : (
                    participants.map((participant) => {
                      const isConnected = connectedParticipantIds.includes(participant.participant_id);
                      return (
                        <View key={participant.participant_id} style={styles.participantRow}>
                          <View style={styles.participantDetails}>
                            <Text style={styles.participantRoleLabel}>
                              {participant.role === 'host' ? 'Host' : 'Guest'}
                            </Text>
                            <Text style={styles.participantMeta}>{formatJoinedAt(participant.joined_at)}</Text>
                          </View>
                          <View
                            style={[
                              styles.participantBadge,
                              isConnected ? styles.participantBadgeOnline : styles.participantBadgeOffline
                            ]}
                          >
                            <Text style={styles.participantBadgeLabel}>
                              {isConnected ? 'Connected' : 'Awaiting connection'}
                            </Text>
                          </View>
                        </View>
                      );
                    })
                  )}
                </View>
              </View>
            )}
          </View>

          <View style={styles.sessionChatCard}>
            <View style={styles.sessionCardHeader}>
              <Text style={styles.sessionCardTitle}>Messages</Text>
              <Text style={styles.chatMetaLabel}>
                {canSendMessage ? 'Live' : 'Waiting for both participants'}
              </Text>
            </View>
            <FlatList
              ref={(ref) => {
                messageListRef.current = ref;
              }}
              data={messages}
              keyExtractor={(item) => item.id}
              style={styles.messageList}
              contentContainerStyle={styles.messageListContent}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <View
                  style={[
                    styles.messageBubble,
                    item.sender === 'self'
                      ? styles.messageBubbleSelf
                      : item.sender === 'peer'
                        ? styles.messageBubblePeer
                        : styles.messageBubbleSystem
                  ]}
                >
                  <Text
                    style={[
                      styles.messageText,
                      item.sender === 'system' && styles.messageTextSystem,
                      item.sender === 'peer' && styles.messageTextPeer
                    ]}
                  >
                    {item.body}
                  </Text>
                  <Text style={styles.messageTimestamp}>
                    {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
              )}
              ListEmptyComponent={
                <Text style={styles.messageEmptyState}>No messages yet. Say hello once everyone is ready!</Text>
              }
            />
            <View style={styles.messageComposer}>
              {!canSendMessage && (
                <Text style={styles.messageComposerHint}>
                  Messages can be sent once both participants are connected.
                </Text>
              )}
              <View style={styles.messageComposerRow}>
                <TextInput
                  style={styles.messageInput}
                  placeholder="Type a message"
                  placeholderTextColor="rgba(219, 237, 255, 0.55)"
                  multiline
                  value={draft}
                  onChangeText={setDraft}
                  editable={canSendMessage}
                  maxLength={messageLimit}
                />
                <TouchableOpacity
                  style={[styles.messageSendButton, sendDisabled && styles.messageSendButtonDisabled]}
                  onPress={handleSendMessage}
                  disabled={sendDisabled}
                >
                  <Ionicons name="send" size={18} color={sendDisabled ? 'rgba(2, 11, 31, 0.6)' : COLORS.midnight} />
                </TouchableOpacity>
              </View>
              <Text style={styles.messageLimitLabel}>
                {draft.length}/{messageLimit} characters
              </Text>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
};

const MainScreen: React.FC = () => {
  const [showForm, setShowForm] = useState(false);
  const [tokenResponse, setTokenResponse] = useState<TokenResponse | null>(null);
  const [inAppSession, setInAppSession] = useState(false);
  const [joiningInApp, setJoiningInApp] = useState(false);
  const [inAppParticipantId, setInAppParticipantId] = useState<string | null>(null);
  const isInAppSessionActive = Boolean(tokenResponse && inAppSession);

  const handleReset = () => {
    setTokenResponse(null);
    setInAppSession(false);
    setInAppParticipantId(null);
    setJoiningInApp(false);
  };

  const handleStartInApp = async () => {
    if (!tokenResponse || joiningInApp) {
      return;
    }

    try {
      setJoiningInApp(true);
      const payload = await joinSession(tokenResponse.token, inAppParticipantId);
      setInAppParticipantId(payload.participant_id);
      setInAppSession(true);
    } catch (error: any) {
      Alert.alert('Cannot start session', error?.message ?? 'Unexpected error while launching the in-app session.');
    } finally {
      setJoiningInApp(false);
    }
  };

  const renderContent = () => {
    if (tokenResponse && inAppSession) {
      if (!inAppParticipantId) {
        return (
          <LinearGradient
            colors={[COLORS.glowSoft, COLORS.glowWarm, COLORS.glowSoft]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.sessionFallbackCard}
          >
            <Text style={styles.sessionFallbackTitle}>Session connection lost</Text>
            <Text style={styles.sessionFallbackBody}>
              We couldn't recover your participant link. Return to the token screen and try launching the in-app session again.
            </Text>
            <TouchableOpacity style={styles.resetButton} onPress={() => setInAppSession(false)}>
              <Text style={styles.resetButtonLabel}>Back to token</Text>
            </TouchableOpacity>
          </LinearGradient>
        );
      }

      return (
        <InAppSessionScreen
          token={tokenResponse}
          participantId={inAppParticipantId}
          onExit={() => setInAppSession(false)}
        />
      );
    }

    if (tokenResponse) {
      return (
        <TokenResultCard
          token={tokenResponse}
          onReset={handleReset}
          onStartInApp={handleStartInApp}
          joiningInApp={joiningInApp}
        />
      );
    }

    return (
      <View style={styles.actionRow}>
        <BigActionButton
          title="Need token"
          description="Create a secure pass with custom duration."
          onPress={() => setShowForm(true)}
          background="rgba(8, 47, 112, 0.72)"
          icon={<Ionicons name="planet" size={42} color={COLORS.aurora} />}
        />
        <BigActionButton
          title="Got token"
          description="Coming soon: instantly jump into live orbit."
          onPress={() => Alert.alert('Coming soon', 'Session join will arrive with the WebRTC update!')}
          background="rgba(6, 36, 92, 0.78)"
          icon={<MaterialCommunityIcons name="shield-check" size={42} color={COLORS.aurora} />}
        />
      </View>
    );
  };

  return (
    <LinearGradient
      colors={[COLORS.midnight, COLORS.deepBlue, COLORS.ocean, COLORS.lagoon]}
      start={{ x: 0.1, y: 0 }}
      end={{ x: 0.9, y: 1 }}
      style={[styles.container, isInAppSessionActive && styles.containerInSession]}
    >
      <StatusBar style="light" />
      {!isInAppSessionActive && (
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Launch a ChatOrbit session</Text>
          <Text style={styles.headerSubtitle}>
            Generate a one-time secure token or prepare to join an existing session with a single tap.
          </Text>
        </View>
      )}
      {renderContent()}
      <NeedTokenForm
        visible={showForm && !tokenResponse}
        onClose={() => setShowForm(false)}
        onGenerated={(token) => {
          setShowForm(false);
          setTokenResponse(token);
          setInAppParticipantId(null);
          setInAppSession(false);
          setJoiningInApp(false);
        }}
      />
    </LinearGradient>
  );
};

export default function App() {
  const [fontsLoaded] = useFonts({
    ...Ionicons.font,
    ...MaterialCommunityIcons.font
  });
  const [accepted, setAccepted] = useState(false);

  if (!fontsLoaded) {
    return (
      <LinearGradient
        colors={[COLORS.midnight, COLORS.deepBlue, COLORS.ocean, COLORS.lagoon]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={styles.loadingContainer}
      >
        <StatusBar style="light" />
        <ActivityIndicator color={COLORS.mint} size="large" />
      </LinearGradient>
    );
  }

  if (!accepted) {
    return <AcceptScreen onAccept={() => setAccepted(true)} />;
  }

  return <MainScreen />;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 64,
    paddingHorizontal: 24
  },
  containerInSession: {
    paddingTop: 24,
    paddingHorizontal: 12
  },
  termsCard: {
    borderRadius: 28,
    padding: 24,
    paddingTop: 48,
    width: '100%',
    maxWidth: 420,
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.glowEdge,
    shadowColor: COLORS.cobaltShadow,
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.35,
    shadowRadius: 32,
    elevation: 12
  },
  logoText: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.ice,
    textAlign: 'center',
    marginBottom: 24,
    letterSpacing: 1.2
  },
  termsScroll: {
    flex: 1,
    borderRadius: 16,
    backgroundColor: 'rgba(15, 83, 170, 0.2)'
  },
  termsContent: {
    padding: 16
  },
  termsText: {
    color: 'rgba(232, 244, 255, 0.92)',
    fontSize: 16,
    lineHeight: 24
  },
  acceptButton: {
    marginTop: 20,
    backgroundColor: COLORS.aurora,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center'
  },
  acceptButtonDisabled: {
    backgroundColor: 'rgba(111, 231, 255, 0.3)'
  },
  acceptButtonLabel: {
    color: COLORS.midnight,
    fontSize: 16,
    fontWeight: '600'
  },
  header: {
    width: '100%',
    maxWidth: 480,
    marginBottom: 24
  },
  headerTitle: {
    color: COLORS.white,
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8
  },
  headerSubtitle: {
    color: 'rgba(244, 249, 255, 0.78)',
    fontSize: 16,
    lineHeight: 22
  },
  actionRow: {
    width: '100%',
    maxWidth: 520,
    gap: 16
  },
  bigActionButton: {
    borderRadius: 24,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: COLORS.cobaltShadow,
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.32,
    shadowRadius: 24,
    borderWidth: 1,
    borderColor: COLORS.glowEdge,
    elevation: 8
  },
  bigActionIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(79, 183, 255, 0.16)'
  },
  bigActionTextContainer: {
    flex: 1,
    marginLeft: 16
  },
  bigActionTitle: {
    color: COLORS.ice,
    fontSize: 22,
    fontWeight: '700'
  },
  bigActionDescription: {
    color: 'rgba(219, 237, 255, 0.76)',
    fontSize: 14,
    marginTop: 6
  },
  disabledClose: {
    opacity: 0.4
  },
  formContainer: {
    flex: 1,
    justifyContent: 'flex-start'
  },
  formSafeArea: {
    flex: 1,
    paddingHorizontal: 20
  },
  formHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    marginBottom: 16
  },
  formTitle: {
    color: COLORS.white,
    fontSize: 24,
    fontWeight: '700'
  },
  formCloseButton: {
    padding: 4
  },
  formContent: {
    paddingBottom: 32
  },
  formSubtitle: {
    color: 'rgba(224, 239, 255, 0.82)',
    marginBottom: 16,
    lineHeight: 20
  },
  pickerGroup: {
    marginBottom: 24
  },
  pickerLabel: {
    color: COLORS.ice,
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 12
  },
  pickerWrapper: {
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: 'rgba(9, 64, 140, 0.42)',
    height: 132
  },
  picker: {
    color: COLORS.aurora,
    width: '100%',
    height: '100%'
  },
  pickerItem: {
    color: COLORS.aurora,
    fontSize: 16,
    height: 132
  },
  generateButton: {
    marginTop: 16,
    backgroundColor: COLORS.lagoon,
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: 'center'
  },
  generateButtonDisabled: {
    opacity: 0.6
  },
  generateButtonLabel: {
    color: COLORS.white,
    fontSize: 17,
    fontWeight: '700'
  },
  resultCard: {
    width: '100%',
    maxWidth: 520,
    borderRadius: 28,
    padding: 24,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: COLORS.glowEdge,
    shadowColor: COLORS.cobaltShadow,
    shadowOffset: { width: 0, height: 22 },
    shadowOpacity: 0.35,
    shadowRadius: 34,
    elevation: 12
  },
  resultTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.ice,
    marginBottom: 12
  },
  tokenText: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.aurora,
    letterSpacing: 1.1,
    marginTop: 4
  },
  expiryText: {
    marginTop: 6,
    color: 'rgba(219, 237, 255, 0.78)',
    fontSize: 14
  },
  resultButtonRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
    gap: 12
  },
  resultMeta: {
    marginTop: 8,
    color: 'rgba(219, 237, 255, 0.78)',
    fontSize: 14,
    lineHeight: 20
  },
  resultButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(5, 32, 80, 0.78)',
    borderRadius: 16,
    paddingVertical: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: COLORS.glowEdge
  },
  resultButtonLabel: {
    color: COLORS.ice,
    fontWeight: '700'
  },
  primaryResultButton: {
    backgroundColor: COLORS.aurora,
    alignSelf: 'stretch',
    borderColor: 'transparent'
  },
  primaryResultButtonLabel: {
    color: COLORS.midnight
  },
  primaryResultButtonDisabled: {
    opacity: 0.6
  },
  startSessionLabel: {
    marginTop: 20,
    color: COLORS.ice,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center'
  },
  sessionButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12
  },
  resetButton: {
    marginTop: 24,
    alignItems: 'center'
  },
  resetButtonLabel: {
    color: COLORS.aurora,
    fontSize: 15,
    textDecorationLine: 'underline',
    fontWeight: '600'
  },
  inAppSessionContainer: {
    width: '100%',
    maxWidth: 520,
    borderRadius: 28,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: COLORS.glowEdge,
    shadowColor: COLORS.cobaltShadow,
    shadowOffset: { width: 0, height: 22 },
    shadowOpacity: 0.35,
    shadowRadius: 34,
    elevation: 12,
    flex: 1,
    overflow: 'hidden'
  },
  inAppSessionSafeArea: {
    flex: 1
  },
  inAppHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8
  },
  inAppBackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(6, 36, 92, 0.64)',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.glowEdge
  },
  inAppBackLabel: {
    color: COLORS.ice,
    fontWeight: '600'
  },
  inAppHeaderTextGroup: {
    flex: 1,
    marginLeft: 16
  },
  inAppTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.ice
  },
  inAppSubtitle: {
    marginTop: 6,
    color: 'rgba(219, 237, 255, 0.78)',
    lineHeight: 20
  },
  sessionScrollContainer: {
    flex: 1
  },
  sessionScrollContent: {
    paddingBottom: 28,
    gap: 18
  },
  sessionStatusCard: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(111, 214, 255, 0.45)',
    backgroundColor: 'rgba(2, 11, 31, 0.78)',
    padding: 20,
    gap: 14
  },
  sessionChatCard: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(111, 214, 255, 0.38)',
    backgroundColor: 'rgba(6, 36, 92, 0.66)',
    padding: 20,
    flex: 1,
    minHeight: 320
  },
  sessionCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  sessionCardTitle: {
    color: COLORS.ice,
    fontSize: 18,
    fontWeight: '700'
  },
  sessionCardDescription: {
    color: 'rgba(219, 237, 255, 0.78)',
    lineHeight: 20
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999
  },
  statusPillIndicator: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: COLORS.ice
  },
  statusPillLabel: {
    color: COLORS.midnight,
    fontWeight: '600',
    fontSize: 13
  },
  statusPillSuccess: {
    backgroundColor: COLORS.aurora
  },
  statusPillWaiting: {
    backgroundColor: '#FFD166'
  },
  statusPillInactive: {
    backgroundColor: 'rgba(219, 237, 255, 0.68)'
  },
  statusLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  statusLoadingLabel: {
    color: 'rgba(219, 237, 255, 0.82)',
    fontWeight: '600'
  },
  statusErrorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(239, 71, 111, 0.16)',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(239, 71, 111, 0.32)'
  },
  statusErrorLabel: {
    color: COLORS.danger,
    flex: 1,
    fontWeight: '600'
  },
  statusMetricsContainer: {
    gap: 12
  },
  statusMetricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  statusMetricLabel: {
    color: 'rgba(219, 237, 255, 0.7)',
    fontWeight: '600'
  },
  statusMetricValue: {
    color: COLORS.ice,
    fontWeight: '600'
  },
  participantList: {
    marginTop: 12,
    gap: 12
  },
  participantRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 18,
    backgroundColor: 'rgba(4, 23, 60, 0.66)',
    borderWidth: 1,
    borderColor: 'rgba(111, 214, 255, 0.24)'
  },
  participantDetails: {
    flex: 1,
    marginRight: 12
  },
  participantRoleLabel: {
    color: COLORS.ice,
    fontWeight: '700'
  },
  participantMeta: {
    marginTop: 4,
    color: 'rgba(219, 237, 255, 0.68)',
    fontSize: 12
  },
  participantBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999
  },
  participantBadgeOnline: {
    backgroundColor: 'rgba(136, 230, 255, 0.22)',
    borderWidth: 1,
    borderColor: 'rgba(136, 230, 255, 0.5)'
  },
  participantBadgeOffline: {
    backgroundColor: 'rgba(255, 209, 102, 0.22)',
    borderWidth: 1,
    borderColor: 'rgba(255, 209, 102, 0.4)'
  },
  participantBadgeLabel: {
    color: COLORS.ice,
    fontWeight: '600',
    fontSize: 12
  },
  participantEmpty: {
    color: 'rgba(219, 237, 255, 0.65)',
    fontStyle: 'italic'
  },
  chatMetaLabel: {
    color: 'rgba(219, 237, 255, 0.7)',
    fontWeight: '600'
  },
  messageList: {
    flexGrow: 0,
    marginTop: 16,
    maxHeight: 260
  },
  messageListContent: {
    paddingBottom: 12
  },
  messageBubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    marginBottom: 10,
    maxWidth: '85%',
    alignSelf: 'flex-start'
  },
  messageBubbleSelf: {
    alignSelf: 'flex-end',
    backgroundColor: COLORS.aurora
  },
  messageBubblePeer: {
    backgroundColor: 'rgba(2, 11, 31, 0.72)',
    borderWidth: 1,
    borderColor: 'rgba(111, 214, 255, 0.28)'
  },
  messageBubbleSystem: {
    alignSelf: 'center',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(111, 214, 255, 0.32)'
  },
  messageText: {
    color: COLORS.midnight,
    fontWeight: '600'
  },
  messageTextSystem: {
    color: 'rgba(219, 237, 255, 0.85)'
  },
  messageTextPeer: {
    color: 'rgba(219, 237, 255, 0.9)'
  },
  messageTimestamp: {
    marginTop: 6,
    fontSize: 11,
    color: 'rgba(2, 11, 31, 0.64)',
    fontWeight: '600'
  },
  messageEmptyState: {
    color: 'rgba(219, 237, 255, 0.68)',
    textAlign: 'center',
    marginTop: 12
  },
  messageComposer: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(111, 214, 255, 0.26)',
    paddingTop: 12
  },
  messageComposerHint: {
    color: 'rgba(219, 237, 255, 0.65)',
    marginBottom: 10
  },
  messageComposerRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12
  },
  messageInput: {
    flex: 1,
    minHeight: 42,
    maxHeight: 140,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(111, 214, 255, 0.36)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: COLORS.ice,
    backgroundColor: 'rgba(2, 11, 31, 0.7)'
  },
  messageSendButton: {
    width: 44,
    height: 44,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.aurora,
    shadowColor: COLORS.cobaltShadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.24,
    shadowRadius: 12,
    elevation: 4
  },
  messageSendButtonDisabled: {
    backgroundColor: 'rgba(219, 237, 255, 0.42)'
  },
  messageLimitLabel: {
    marginTop: 8,
    color: 'rgba(219, 237, 255, 0.6)',
    fontSize: 12,
    alignSelf: 'flex-end'
  },
  sessionFallbackCard: {
    width: '100%',
    maxWidth: 520,
    borderRadius: 28,
    padding: 24,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: COLORS.glowEdge,
    shadowColor: COLORS.cobaltShadow,
    shadowOffset: { width: 0, height: 22 },
    shadowOpacity: 0.35,
    shadowRadius: 34,
    elevation: 12,
    gap: 16
  },
  sessionFallbackTitle: {
    color: COLORS.ice,
    fontSize: 20,
    fontWeight: '700'
  },
  sessionFallbackBody: {
    color: 'rgba(219, 237, 255, 0.78)',
    lineHeight: 20
  }
});
