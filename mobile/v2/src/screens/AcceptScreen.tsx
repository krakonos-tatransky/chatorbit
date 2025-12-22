/**
 * Accept Screen
 *
 * Entry screen for joining a session with a token.
 * Users input a 6-character token to join a chat session.
 */

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
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Button, Input, Card } from '@/components/ui';
import { COLORS, SPACING, TEXT_STYLES } from '@/constants';
import { useSessionStore } from '@/state';

type RootStackParamList = {
  Accept: undefined;
  Session: undefined;
};

type AcceptScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Accept'
>;

interface AcceptScreenProps {
  navigation: AcceptScreenNavigationProp;
}

export const AcceptScreen: React.FC<AcceptScreenProps> = ({ navigation }) => {
  const [token, setToken] = useState('');
  const { joinSession, isJoining, error } = useSessionStore();

  const handleJoin = async () => {
    // Validate token
    const trimmedToken = token.trim().toUpperCase();
    if (trimmedToken.length !== 6) {
      Alert.alert('Invalid Token', 'Please enter a 6-character token');
      return;
    }

    try {
      // Join session (generates participant ID automatically)
      await joinSession(trimmedToken, null, null);

      // Navigate to session screen
      navigation.navigate('Session');
    } catch (error) {
      console.error('Failed to join session:', error);
      Alert.alert(
        'Join Failed',
        error instanceof Error ? error.message : 'Failed to join session'
      );
    }
  };

  const handleTokenChange = (text: string) => {
    // Convert to uppercase and limit to 6 characters
    const formatted = text.toUpperCase().slice(0, 6);
    setToken(formatted);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>ChatOrbit v2</Text>
          <Text style={styles.subtitle}>Enter your session token to join</Text>
        </View>

        {/* Token Input Card */}
        <Card style={styles.card}>
          <Input
            label="Session Token"
            placeholder="ABC123"
            value={token}
            onChangeText={handleTokenChange}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={6}
            error={error || undefined}
            style={styles.input}
          />

          <Button
            onPress={handleJoin}
            loading={isJoining}
            disabled={token.length !== 6}
            fullWidth
            style={styles.button}
          >
            Join Session
          </Button>

          {/* Info */}
          <Text style={styles.info}>
            Enter the 6-character token shared with you to join the video chat
            session.
          </Text>
        </Card>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Mobile-to-Mobile • End-to-End Encrypted
          </Text>
        </View>
        </ScrollView>
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
  scrollView: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.xl,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  title: {
    ...TEXT_STYLES.h1,
    color: COLORS.text.primary,
    marginBottom: SPACING.sm,
  },
  subtitle: {
    ...TEXT_STYLES.body,
    color: COLORS.text.secondary,
    textAlign: 'center',
  },
  card: {
    marginBottom: SPACING.xl,
  },
  input: {
    fontSize: 24,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 4,
  },
  button: {
    marginTop: SPACING.md,
  },
  info: {
    ...TEXT_STYLES.caption,
    color: COLORS.text.secondary,
    textAlign: 'center',
    marginTop: SPACING.md,
  },
  footer: {
    alignItems: 'center',
  },
  footerText: {
    ...TEXT_STYLES.caption,
    color: COLORS.text.disabled,
  },
});
