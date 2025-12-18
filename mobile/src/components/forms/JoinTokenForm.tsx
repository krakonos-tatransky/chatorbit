import React, { useState } from 'react';
import { ActivityIndicator, Alert, Modal, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

import { COLORS } from '../../constants/colors';
import { styles } from '../../constants/styles';
import { joinSession } from '../../utils/session';
import { JoinResponse } from '../../types';

export type JoinTokenFormResult = { payload: JoinResponse; token: string };

export type JoinTokenFormProps = {
  visible: boolean;
  onClose: () => void;
  onJoined: (result: JoinTokenFormResult) => void;
  webRtcAvailable: boolean;
};

export const JoinTokenForm: React.FC<JoinTokenFormProps> = ({ visible, onClose, onJoined, webRtcAvailable }) => {
  const [tokenValue, setTokenValue] = useState('');
  const [loading, setLoading] = useState(false);

  const handleJoin = async () => {
    if (!tokenValue.trim()) {
      Alert.alert('Missing token', 'Please enter a token to join the session.');
      return;
    }

    try {
      setLoading(true);
      const trimmed = tokenValue.trim();
      const payload = await joinSession(trimmed);
      onJoined({ payload, token: trimmed });
      setTokenValue('');
    } catch (error: any) {
      Alert.alert('Cannot join session', error?.message ?? 'Unexpected error while joining the session.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.joinOverlay}>
        <LinearGradient colors={[COLORS.glowSoft, COLORS.glowWarm]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.joinCard}>
          <View style={styles.formHeader}>
            <Text style={styles.formTitle}>Enter a token</Text>
            <TouchableOpacity style={styles.formCloseButton} onPress={onClose}>
              <Ionicons name="close" size={20} color={COLORS.ice} />
            </TouchableOpacity>
          </View>
          <Text style={styles.joinHelper}>Paste or type the token you received to join the live session natively.</Text>
          {!webRtcAvailable && (
            <View style={styles.joinInfoBanner}>
              <Ionicons name="warning" size={18} color={COLORS.danger} />
              <Text style={styles.joinInfoBannerText}>
                Expo Go doesn’t include the WebRTC native module. Install the Expo dev build (run “npx expo run:ios” or “npx expo run:android”) to join in-app, or tap “On web” to continue in the browser.
              </Text>
            </View>
          )}
          <TextInput
            style={styles.joinInput}
            placeholder="CHAT-XXXX-XXXX"
            placeholderTextColor="rgba(255,255,255,0.6)"
            value={tokenValue}
            onChangeText={setTokenValue}
            autoCapitalize="characters"
            autoCorrect={false}
            editable={!loading}
          />
          <TouchableOpacity
            style={[styles.joinButton, (loading || !tokenValue.trim()) && styles.joinButtonDisabled]}
            onPress={handleJoin}
            disabled={loading || !tokenValue.trim()}
          >
            {loading ? <ActivityIndicator color={COLORS.midnight} /> : <Text style={styles.joinButtonLabel}>Join session</Text>}
          </TouchableOpacity>
        </LinearGradient>
      </View>
    </Modal>
  );
};
