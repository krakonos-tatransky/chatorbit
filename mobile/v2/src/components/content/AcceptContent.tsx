import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ScrollView,
} from 'react-native';
import { COLORS } from '../../constants/colors';
import { TEXT_STYLES } from '../../constants/typography';
import { SPACING } from '../../constants/spacing';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useSessionStore } from '../../state/stores/sessionStore';
import { getDeviceId } from '../../utils/deviceId';

interface AcceptContentProps {
  onSessionStart: () => void;
}

export const AcceptContent: React.FC<AcceptContentProps> = ({
  onSessionStart,
}) => {
  const [token, setToken] = useState('');
  const { joinSession, isJoining, error } = useSessionStore();

  const handleJoin = async () => {
    const trimmedToken = token.trim().toLowerCase();
    if (trimmedToken.length !== 32) {
      Alert.alert('Invalid Token', 'Please paste a valid 32-character token');
      return;
    }

    try {
      const deviceId = await getDeviceId();
      await joinSession(trimmedToken, null, deviceId);
      onSessionStart();
    } catch (error) {
      console.error('Failed to join session:', error);
      Alert.alert(
        'Join Failed',
        error instanceof Error ? error.message : 'Failed to join session'
      );
    }
  };

  const handleTokenChange = (text: string) => {
    // Accept lowercase hex characters, strip any whitespace
    const formatted = text.toLowerCase().replace(/\s/g, '').slice(0, 32);
    setToken(formatted);
  };

  return (
    <KeyboardAvoidingView
      style={styles.keyboardView}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.pageTitle}>Join Session</Text>
        <Text style={styles.pageSubtitle}>Enter the token you received</Text>

        <Text style={styles.sectionTitle}>Session Token</Text>
        <Text style={styles.sectionDescription}>
          Paste the 32-character token shared with you
        </Text>

        <Input
          placeholder="Paste token here"
          value={token}
          onChangeText={handleTokenChange}
          autoCapitalize="none"
          autoCorrect={false}
          maxLength={32}
          error={error || undefined}
          style={styles.input}
        />

        <View style={styles.buttonContainer}>
          <Button
            onPress={handleJoin}
            loading={isJoining}
            disabled={token.length !== 32}
            fullWidth
          >
            Join Session
          </Button>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Mobile-to-Mobile • End-to-End Encrypted
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.xl,
  },
  pageTitle: {
    ...TEXT_STYLES.h2,
    color: COLORS.accent.yellow,
    textAlign: 'center',
  },
  pageSubtitle: {
    ...TEXT_STYLES.caption,
    color: COLORS.text.secondary,
    textAlign: 'center',
    marginTop: SPACING.xs,
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    ...TEXT_STYLES.bodyMedium,
    color: COLORS.text.primary,
    marginTop: SPACING.md,
    marginBottom: SPACING.xs,
  },
  sectionDescription: {
    ...TEXT_STYLES.caption,
    color: COLORS.text.secondary,
    marginBottom: SPACING.sm,
  },
  input: {
    fontSize: 14,
    fontFamily: 'JetBrainsMono',
    textAlign: 'center',
    letterSpacing: 1,
  },
  buttonContainer: {
    marginTop: SPACING.xl,
  },
  footer: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingVertical: SPACING.lg,
  },
  footerText: {
    ...TEXT_STYLES.caption,
    color: COLORS.text.disabled,
  },
});
