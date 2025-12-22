import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { COLORS } from '../constants/colors';
import { TEXT_STYLES } from '../constants/typography';
import { SPACING } from '../constants/spacing';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';

type RootStackParamList = {
  Splash: undefined;
  Landing: undefined;
  Mint: undefined;
  Accept: undefined;
  Session: undefined;
};

type LandingScreenProps = NativeStackScreenProps<RootStackParamList, 'Landing'>;

export const LandingScreen: React.FC<LandingScreenProps> = ({ navigation }) => {
  const handleMintToken = () => {
    navigation.navigate('Mint');
  };

  const handleJoinSession = () => {
    navigation.navigate('Accept');
  };

  return (
    <LinearGradient
      colors={['#0a1628', '#122a4d', '#1a3a5c', '#0d2137']}
      locations={[0, 0.3, 0.7, 1]}
      style={styles.gradient}
    >
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Header Bar */}
        <View style={styles.headerBar}>
          <Text style={styles.headerTitle}>ChatOrbit</Text>
          <Text style={styles.headerSubtitle}>Mobile-to-Mobile Video Chat</Text>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.contentContainer}
        >
          <Card style={styles.card}>
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle}>Get Started</Text>
              <Text style={styles.cardDescription}>
                Choose an option below to start your encrypted video chat session
              </Text>

              <View style={styles.buttonContainer}>
                <Button
                  onPress={handleMintToken}
                  variant="primary"
                  fullWidth
                >
                  Create New Session
                </Button>
                <View style={styles.buttonSpacer} />
                <Button
                  onPress={handleJoinSession}
                  variant="secondary"
                  fullWidth
                >
                  Join Existing Session
                </Button>
              </View>

              <View style={styles.featureList}>
                <Text style={styles.featureItem}>🔒 End-to-end encrypted</Text>
                <Text style={styles.featureItem}>📹 HD video chat</Text>
                <Text style={styles.featureItem}>💬 Secure messaging</Text>
                <Text style={styles.featureItem}>⏱️ Time-limited sessions</Text>
              </View>
            </View>
          </Card>

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Your privacy is protected with end-to-end encryption
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  headerBar: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  headerTitle: {
    ...TEXT_STYLES.h1,
    color: COLORS.accent.yellow,
    textAlign: 'center',
  },
  headerSubtitle: {
    ...TEXT_STYLES.caption,
    color: COLORS.text.secondary,
    textAlign: 'center',
    marginTop: SPACING.xs,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
    padding: SPACING.lg,
    justifyContent: 'center',
  },
  card: {
    marginBottom: SPACING.lg,
  },
  cardContent: {
    padding: SPACING.lg,
  },
  cardTitle: {
    ...TEXT_STYLES.h2,
    color: COLORS.text.primary,
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  cardDescription: {
    ...TEXT_STYLES.body,
    color: COLORS.text.secondary,
    textAlign: 'center',
    marginBottom: SPACING.xl,
  },
  buttonContainer: {
    marginBottom: SPACING.lg,
  },
  buttonSpacer: {
    height: SPACING.md,
  },
  featureList: {
    gap: SPACING.sm,
  },
  featureItem: {
    ...TEXT_STYLES.body,
    color: COLORS.text.secondary,
    textAlign: 'center',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: SPACING.lg,
  },
  footerText: {
    ...TEXT_STYLES.caption,
    color: COLORS.text.secondary,
    textAlign: 'center',
  },
});
