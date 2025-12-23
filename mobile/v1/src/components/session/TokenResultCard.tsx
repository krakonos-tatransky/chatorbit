import React, { useMemo, useState } from 'react';
import { Alert, Linking, Share, Text, TouchableOpacity, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { COLORS } from '../../constants/colors';
import { styles } from '../../constants/styles';
import { joinSession } from '../../utils/session';
import { TokenResponse } from '../../types';

export type TokenResultCardProps = {
  token: TokenResponse;
  onReset: () => void;
  onStartInApp: () => void | Promise<void>;
  joiningInApp: boolean;
  webRtcAvailable: boolean;
};

export const TokenResultCard: React.FC<TokenResultCardProps> = ({
  token,
  onReset,
  onStartInApp,
  joiningInApp,
  webRtcAvailable
}) => {
  const shareMessage = useMemo(() => `Join my ChatOrbit session using this token: ${token.token}`, [token.token]);
  const sessionMinutes = Math.max(1, Math.round(token.session_ttl_seconds / 60));
  const messageLimit = token.message_char_limit.toLocaleString();
  const [launchingWeb, setLaunchingWeb] = useState(false);
  const [storedParticipantId, setStoredParticipantId] = useState<string | null>(null);
  const inAppDisabled = joiningInApp || !webRtcAvailable;

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
      style={styles.tokenCard}
    >
      <View style={styles.tokenHeader}>
        <Text style={styles.tokenTitle}>Token ready</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeLabel}>Share securely</Text>
        </View>
      </View>
      <Text style={styles.tokenValue}>{token.token}</Text>
      <Text style={styles.tokenMeta}>
        Valid until {new Date(token.validity_expires_at).toLocaleString()} · {sessionMinutes}-minute session · Message limit: {messageLimit} characters
      </Text>
      <View style={styles.tokenActions}>
        <TouchableOpacity style={styles.tokenActionButton} onPress={copyToClipboard}>
          <Ionicons name="copy" size={18} color={COLORS.ice} />
          <Text style={styles.tokenActionLabel}>Copy</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tokenActionButton} onPress={shareToken}>
          <Ionicons name="share-social" size={18} color={COLORS.ice} />
          <Text style={styles.tokenActionLabel}>Share</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.tokenActions}>
        <TouchableOpacity
          style={[styles.tokenActionButton, inAppDisabled && styles.joinButtonDisabled]}
          onPress={onStartInApp}
          disabled={inAppDisabled}
        >
          {joiningInApp ? <Ionicons name="hourglass" size={18} color={COLORS.midnight} /> : <Ionicons name="rocket" size={18} color={COLORS.ice} />}
          <Text style={styles.tokenActionLabel}>Open in app</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tokenActionButton} onPress={startSessionOnWeb} disabled={launchingWeb}>
          {launchingWeb ? <Ionicons name="hourglass" size={18} color={COLORS.midnight} /> : <Ionicons name="globe" size={18} color={COLORS.ice} />}
          <Text style={styles.tokenActionLabel}>Open on web</Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity style={styles.resetButton} onPress={onReset}>
        <Text style={styles.resetButtonLabel}>Generate another token</Text>
      </TouchableOpacity>
    </LinearGradient>
  );
};
