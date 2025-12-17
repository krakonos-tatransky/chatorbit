import React, { useState } from 'react';
import { ActivityIndicator, Alert, Modal, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { Picker } from '@react-native-picker/picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { COLORS } from '../constants/colors';
import { styles } from '../constants/styles';
import {
  DEFAULT_MESSAGE_CHAR_LIMIT,
  SESSION_TTL_MINUTES,
  durationOptions,
  tokenTierOptions,
  validityOptions
} from '../constants/options';
import { API_BASE_URL } from '../session/config';
import { DurationOption, TokenResponse, TokenTierOption, ValidityOption } from '../types';

export type NeedTokenFormProps = {
  visible: boolean;
  onClose: () => void;
  onGenerated: (token: TokenResponse) => void;
};

export const NeedTokenForm: React.FC<NeedTokenFormProps> = ({ visible, onClose, onGenerated }) => {
  const [selectedDuration, setSelectedDuration] = useState<DurationOption['value']>(durationOptions[2].value);
  const [selectedTier, setSelectedTier] = useState<TokenTierOption['value']>(tokenTierOptions[0].value);
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
                  onValueChange={(value: DurationOption['value']) => setSelectedDuration(value)}
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
                  onValueChange={(value: ValidityOption['value']) => setSelectedValidity(value)}
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
                  onValueChange={(value: TokenTierOption['value']) => setSelectedTier(value)}
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
            <Text style={styles.termsHint}>Tokens inherit the ChatOrbit community standards. By generating a token you agree to enforce them.</Text>
            <View style={styles.formActions}>
              <TouchableOpacity style={styles.secondaryButton} onPress={onClose} disabled={loading}>
                <Text style={styles.secondaryButtonLabel}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.primaryButton} onPress={requestToken} disabled={loading}>
                {loading ? <ActivityIndicator color={COLORS.midnight} /> : <Text style={styles.primaryButtonLabel}>Create token</Text>}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </SafeAreaView>
      </LinearGradient>
    </Modal>
  );
};
