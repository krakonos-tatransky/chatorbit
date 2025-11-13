import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  SafeAreaView,
  ScrollView,
  Share,
  StyleSheet,
  Text,
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
  midnight: '#071B2F',
  deepBlue: '#0E3059',
  ocean: '#164A89',
  lagoon: '#1C6BC7',
  ice: '#E6F3FF',
  mint: '#8EE7FF',
  solar: '#FFB86C',
  white: '#FFFFFF',
  lilac: '#B4C5FF',
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
    <LinearGradient colors={[COLORS.midnight, COLORS.deepBlue, COLORS.ocean]} style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.termsCard}>
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
      </View>
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
      <LinearGradient colors={[COLORS.midnight, COLORS.deepBlue, COLORS.ocean]} style={styles.formContainer}>
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
                  dropdownIconColor={COLORS.mint}
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
                  dropdownIconColor={COLORS.mint}
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
                  dropdownIconColor={COLORS.mint}
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
  onStartInApp: () => void;
}> = ({ token, onReset, onStartInApp }) => {
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
      let participantId = storedParticipantId;

      if (!participantId) {
        const response = await fetch(`${API_BASE_URL}/sessions/join`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            token: token.token.trim(),
            participant_id: storedParticipantId ?? undefined,
            client_identity: MOBILE_CLIENT_IDENTITY
          })
        });

        const rawBody = await response.text();

        if (!response.ok) {
          let friendlyMessage = rawBody || 'Unable to start a web session.';
          try {
            const parsed = JSON.parse(rawBody);
            if (typeof parsed?.detail === 'string') {
              friendlyMessage = parsed.detail;
            } else if (Array.isArray(parsed?.detail)) {
              friendlyMessage = parsed.detail.map((item: any) => item?.msg).filter(Boolean).join('\n');
            }
          } catch {
            // Ignore JSON parsing issues and fall back to the raw response text.
          }
          throw new Error(friendlyMessage);
        }

        try {
          const payload = JSON.parse(rawBody) as JoinResponse;
          participantId = payload?.participant_id ?? null;
          if (participantId) {
            setStoredParticipantId(participantId);
          }
        } catch {
          throw new Error('Received an unexpected response from the session join API.');
        }
      }

      if (!participantId) {
        throw new Error('Missing participant details for launching the web session.');
      }

      const sessionUrl = `https://chatorbit.com/session/${encodeURIComponent(token.token)}?participant=${encodeURIComponent(participantId)}`;
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
    <View style={styles.resultCard}>
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
          <Ionicons name="copy-outline" size={20} color={COLORS.deepBlue} />
          <Text style={styles.resultButtonLabel}>Copy</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.resultButton} onPress={shareToken}>
          <Ionicons name="share-outline" size={20} color={COLORS.deepBlue} />
          <Text style={styles.resultButtonLabel}>Share</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.startSessionLabel}>Start session</Text>
      <View style={styles.sessionButtonsRow}>
        <TouchableOpacity style={[styles.resultButton, styles.primaryResultButton]} onPress={onStartInApp}>
          <MaterialCommunityIcons name="tablet-cellphone" size={20} color={COLORS.midnight} />
          <Text style={[styles.resultButtonLabel, styles.primaryResultButtonLabel]}>In app</Text>
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
    </View>
  );
};

const InAppSessionScreen: React.FC<{ token: TokenResponse; onExit: () => void }> = ({ token, onExit }) => {
  return (
    <View style={styles.inAppSessionContainer}>
      <View style={styles.inAppHeader}>
        <Text style={styles.inAppTitle}>Session cockpit</Text>
        <Text style={styles.inAppSubtitle}>You're hosting directly from the app. Participants can join with the token below.</Text>
      </View>
      <View style={styles.inAppCard}>
        <Text style={styles.inAppCardTitle}>Status</Text>
        <Text style={styles.inAppCardBody}>Waiting for participants to connect…</Text>
        <Text style={styles.inAppTokenLabel}>Session token</Text>
        <Text style={styles.inAppToken}>{token.token}</Text>
      </View>
      <View style={[styles.inAppCard, styles.chatCard]}>
        <Text style={styles.inAppCardTitle}>Chat preview</Text>
        <Text style={styles.inAppCardBody}>Text chat will appear here once the realtime channel is active.</Text>
      </View>
      <TouchableOpacity style={styles.exitSessionButton} onPress={onExit}>
        <Text style={styles.exitSessionButtonLabel}>Back to token details</Text>
      </TouchableOpacity>
    </View>
  );
};

const MainScreen: React.FC = () => {
  const [showForm, setShowForm] = useState(false);
  const [tokenResponse, setTokenResponse] = useState<TokenResponse | null>(null);
  const [inAppSession, setInAppSession] = useState(false);

  const handleReset = () => {
    setTokenResponse(null);
    setInAppSession(false);
  };

  const renderContent = () => {
    if (tokenResponse && inAppSession) {
      return <InAppSessionScreen token={tokenResponse} onExit={() => setInAppSession(false)} />;
    }

    if (tokenResponse) {
      return (
        <TokenResultCard
          token={tokenResponse}
          onReset={handleReset}
          onStartInApp={() => setInAppSession(true)}
        />
      );
    }

    return (
      <View style={styles.actionRow}>
        <BigActionButton
          title="Need token"
          description="Create a secure pass with custom duration."
          onPress={() => setShowForm(true)}
          background={COLORS.ice}
          icon={<Ionicons name="planet" size={42} color={COLORS.deepBlue} />}
        />
        <BigActionButton
          title="Got token"
          description="Coming soon: instantly jump into live orbit."
          onPress={() => Alert.alert('Coming soon', 'Session join will arrive with the WebRTC update!')}
          background={COLORS.lilac}
          icon={<MaterialCommunityIcons name="shield-check" size={42} color={COLORS.deepBlue} />}
        />
      </View>
    );
  };

  return (
    <LinearGradient colors={[COLORS.deepBlue, COLORS.ocean, COLORS.lagoon]} style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Launch a ChatOrbit session</Text>
        <Text style={styles.headerSubtitle}>
          Generate a one-time secure token or prepare to join an existing session with a single tap.
        </Text>
      </View>
      {renderContent()}
      <NeedTokenForm
        visible={showForm && !tokenResponse}
        onClose={() => setShowForm(false)}
        onGenerated={(token) => {
          setShowForm(false);
          setTokenResponse(token);
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
      <LinearGradient colors={[COLORS.midnight, COLORS.deepBlue, COLORS.ocean]} style={styles.loadingContainer}>
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
  termsCard: {
    backgroundColor: 'rgba(7, 27, 47, 0.72)',
    borderRadius: 28,
    padding: 24,
    paddingTop: 48,
    width: '100%',
    maxWidth: 420,
    flex: 1,
    shadowColor: COLORS.lagoon,
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.24,
    shadowRadius: 24
  },
  logoText: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.mint,
    textAlign: 'center',
    marginBottom: 24,
    letterSpacing: 1.2
  },
  termsScroll: {
    flex: 1,
    borderRadius: 16,
    backgroundColor: 'rgba(230, 243, 255, 0.08)'
  },
  termsContent: {
    padding: 16
  },
  termsText: {
    color: COLORS.ice,
    fontSize: 16,
    lineHeight: 24
  },
  acceptButton: {
    marginTop: 20,
    backgroundColor: COLORS.lagoon,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center'
  },
  acceptButtonDisabled: {
    backgroundColor: 'rgba(28, 107, 199, 0.4)'
  },
  acceptButtonLabel: {
    color: COLORS.white,
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
    color: 'rgba(230, 243, 255, 0.75)',
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
    shadowColor: COLORS.midnight,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 18,
    elevation: 8
  },
  bigActionIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(22, 74, 137, 0.1)'
  },
  bigActionTextContainer: {
    flex: 1,
    marginLeft: 16
  },
  bigActionTitle: {
    color: COLORS.deepBlue,
    fontSize: 22,
    fontWeight: '700'
  },
  bigActionDescription: {
    color: COLORS.deepBlue,
    fontSize: 14,
    opacity: 0.7,
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
    color: 'rgba(230, 243, 255, 0.8)',
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
    backgroundColor: 'rgba(230, 243, 255, 0.12)',
    height: 132
  },
  picker: {
    color: COLORS.mint,
    width: '100%',
    height: '100%'
  },
  pickerItem: {
    color: COLORS.mint,
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
    backgroundColor: 'rgba(230, 243, 255, 0.92)',
    borderRadius: 28,
    padding: 24,
    marginBottom: 32,
    shadowColor: COLORS.midnight,
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10
  },
  resultTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.deepBlue,
    marginBottom: 12
  },
  tokenText: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.solar,
    letterSpacing: 1.1,
    marginTop: 4
  },
  expiryText: {
    marginTop: 6,
    color: COLORS.ocean,
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
    color: COLORS.ocean,
    fontSize: 14,
    lineHeight: 20
  },
  resultButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.mint,
    borderRadius: 16,
    paddingVertical: 12,
    gap: 8
  },
  resultButtonLabel: {
    color: COLORS.deepBlue,
    fontWeight: '700'
  },
  primaryResultButton: {
    backgroundColor: COLORS.solar,
    alignSelf: 'stretch'
  },
  primaryResultButtonLabel: {
    color: COLORS.midnight
  },
  primaryResultButtonDisabled: {
    opacity: 0.6
  },
  startSessionLabel: {
    marginTop: 20,
    color: COLORS.deepBlue,
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
    color: COLORS.deepBlue,
    fontSize: 15,
    textDecorationLine: 'underline',
    fontWeight: '600'
  },
  inAppSessionContainer: {
    width: '100%',
    maxWidth: 520,
    backgroundColor: 'rgba(230, 243, 255, 0.92)',
    borderRadius: 28,
    padding: 24,
    marginBottom: 32,
    shadowColor: COLORS.midnight,
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10
  },
  inAppHeader: {
    marginBottom: 20
  },
  inAppTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.deepBlue
  },
  inAppSubtitle: {
    marginTop: 8,
    color: COLORS.ocean,
    lineHeight: 20
  },
  inAppCard: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: COLORS.midnight,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 14,
    elevation: 4
  },
  inAppCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.deepBlue
  },
  inAppCardBody: {
    marginTop: 8,
    color: COLORS.ocean,
    lineHeight: 20
  },
  inAppTokenLabel: {
    marginTop: 16,
    color: COLORS.deepBlue,
    fontSize: 12,
    textTransform: 'uppercase',
    fontWeight: '700',
    letterSpacing: 1
  },
  inAppToken: {
    marginTop: 8,
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.solar,
    letterSpacing: 1.1
  },
  chatCard: {
    borderStyle: 'dashed',
    borderWidth: 1.5,
    borderColor: 'rgba(7, 27, 47, 0.18)'
  },
  exitSessionButton: {
    marginTop: 8,
    alignSelf: 'center'
  },
  exitSessionButtonLabel: {
    color: COLORS.deepBlue,
    fontSize: 15,
    textDecorationLine: 'underline',
    fontWeight: '600'
  }
});
