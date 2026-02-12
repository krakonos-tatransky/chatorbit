/**
 * Help Screen
 *
 * Displays troubleshooting information for video calls and a contact support form.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { COLORS } from '../constants/colors';
import { TEXT_STYLES } from '../constants/typography';
import { SPACING } from '../constants/spacing';
import { Header } from '../components/layout/Header';
import { BackgroundPattern } from '../components/ui';
import { useSettingsStore, selectBackgroundPattern, selectPatternSize, selectPatternOpacity } from '../state';
import { useTranslation } from '../i18n';
import { apiClient } from '../services/api';

type RootStackParamList = {
  Main: undefined;
  Help: undefined;
  Terms: undefined;
  Privacy: undefined;
};

type HelpScreenProps = NativeStackScreenProps<RootStackParamList, 'Help'>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const SUBJECT_KEYS = ['general', 'technical', 'feature', 'other'] as const;
const SUBJECT_VALUES: Record<string, string> = {
  general: 'General Question',
  technical: 'Technical Issue',
  feature: 'Feature Request',
  other: 'Other',
};

export const HelpScreen: React.FC<HelpScreenProps> = ({ navigation }) => {
  const t = useTranslation();
  const ct = t.help.contactForm;
  const currentPattern = useSettingsStore(selectBackgroundPattern);
  const currentSize = useSettingsStore(selectPatternSize);
  const currentOpacity = useSettingsStore(selectPatternOpacity);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<string>('general');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleBack = () => {
    navigation.goBack();
  };

  const validate = (): string | null => {
    if (!name.trim()) return ct.required;
    if (!email.trim()) return ct.required;
    if (!EMAIL_RE.test(email.trim())) return ct.invalidEmail;
    if (!message.trim()) return ct.required;
    return null;
  };

  const handleSubmit = async () => {
    const err = validate();
    if (err) {
      Alert.alert(t.common.error, err);
      return;
    }
    setSending(true);
    try {
      await apiClient.post('/api/contact', {
        name: name.trim(),
        email: email.trim(),
        subject: SUBJECT_VALUES[selectedSubject] || 'Other',
        message: message.trim(),
      });
      setSent(true);
      setName('');
      setEmail('');
      setSelectedSubject('general');
      setMessage('');
    } catch {
      Alert.alert(t.common.error, ct.error);
    } finally {
      setSending(false);
    }
  };

  const renderSection = (
    sectionKey: 'iphone' | 'android' | 'desktop',
    iconName: 'phone-portrait' | 'logo-android' | 'desktop'
  ) => {
    const section = t.help.sections[sectionKey];
    return (
      <View key={sectionKey} style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name={iconName} size={24} color={COLORS.accent.yellow} />
          <Text style={styles.cardTitle} maxFontSizeMultiplier={1.2}>{section.title}</Text>
        </View>
        <View style={styles.stepsList}>
          {section.steps.map((step, index) => (
            <View key={index} style={styles.stepItem}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText} maxFontSizeMultiplier={1}>{index + 1}</Text>
              </View>
              <Text style={styles.stepText} maxFontSizeMultiplier={1.2}>{step}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <BackgroundPattern variant={currentPattern} patternSize={currentSize} opacity={currentOpacity} />
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <Header onBack={handleBack} />
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView style={styles.scrollView} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <Text style={styles.pageTitle} maxFontSizeMultiplier={1.2}>{t.help.heading}</Text>
            <Text style={styles.intro} maxFontSizeMultiplier={1.2}>{t.help.intro}</Text>

            <View style={styles.section}>
              <Text style={styles.sectionTitle} maxFontSizeMultiplier={1.2}>{t.help.troubleshootingTitle}</Text>
              <Text style={styles.sectionDescription} maxFontSizeMultiplier={1.2}>{t.help.troubleshootingDescription}</Text>
            </View>

            {renderSection('iphone', 'phone-portrait')}
            {renderSection('android', 'logo-android')}
            {renderSection('desktop', 'desktop')}

            {/* Contact Support Form */}
            <View style={styles.contactSection}>
              <View style={styles.contactHeader}>
                <Ionicons name="mail" size={24} color={COLORS.accent.yellow} />
                <Text style={styles.contactTitle} maxFontSizeMultiplier={1.2}>{ct.title}</Text>
              </View>
              <Text style={styles.contactDescription} maxFontSizeMultiplier={1.2}>{ct.description}</Text>

              {sent ? (
                <View style={styles.successBox}>
                  <Ionicons name="checkmark-circle" size={24} color={COLORS.status.success} />
                  <Text style={styles.successText} maxFontSizeMultiplier={1.2}>{ct.success}</Text>
                </View>
              ) : (
                <View style={styles.form}>
                  <TextInput
                    style={styles.input}
                    placeholder={ct.namePlaceholder}
                    placeholderTextColor={COLORS.text.disabled}
                    value={name}
                    onChangeText={setName}
                    autoCapitalize="words"
                    maxFontSizeMultiplier={1.2}
                  />

                  <TextInput
                    style={styles.input}
                    placeholder={ct.emailPlaceholder}
                    placeholderTextColor={COLORS.text.disabled}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    maxFontSizeMultiplier={1.2}
                  />

                  <Text style={styles.fieldLabel} maxFontSizeMultiplier={1.2}>{ct.subjectLabel}</Text>
                  <View style={styles.subjectRow}>
                    {SUBJECT_KEYS.map((key) => (
                      <TouchableOpacity
                        key={key}
                        style={[styles.subjectChip, selectedSubject === key && styles.subjectChipActive]}
                        onPress={() => setSelectedSubject(key)}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[styles.subjectChipText, selectedSubject === key && styles.subjectChipTextActive]}
                          maxFontSizeMultiplier={1.1}
                        >
                          {ct.subjectOptions[key as keyof typeof ct.subjectOptions]}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder={ct.messagePlaceholder}
                    placeholderTextColor={COLORS.text.disabled}
                    value={message}
                    onChangeText={setMessage}
                    multiline
                    numberOfLines={5}
                    textAlignVertical="top"
                    maxFontSizeMultiplier={1.2}
                  />

                  <TouchableOpacity
                    style={[styles.submitButton, sending && styles.submitButtonDisabled]}
                    onPress={handleSubmit}
                    disabled={sending}
                    activeOpacity={0.8}
                  >
                    {sending ? (
                      <ActivityIndicator color={COLORS.background.primary} size="small" />
                    ) : (
                      <Text style={styles.submitButtonText} maxFontSizeMultiplier={1.1}>{ct.send}</Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background.primary,
  },
  flex: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xl,
  },
  pageTitle: {
    ...TEXT_STYLES.h2,
    color: COLORS.accent.yellow,
    textAlign: 'center',
    marginTop: SPACING.lg,
  },
  intro: {
    ...TEXT_STYLES.body,
    color: COLORS.text.secondary,
    textAlign: 'center',
    marginTop: SPACING.sm,
    marginBottom: SPACING.lg,
    lineHeight: 22,
  },
  section: {
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    ...TEXT_STYLES.h3,
    color: COLORS.text.primary,
    marginBottom: SPACING.xs,
  },
  sectionDescription: {
    ...TEXT_STYLES.body,
    color: COLORS.text.secondary,
    lineHeight: 22,
  },
  card: {
    backgroundColor: COLORS.background.secondary,
    borderRadius: 16,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: 'rgba(79, 195, 247, 0.15)',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  cardTitle: {
    ...TEXT_STYLES.bodyMedium,
    color: COLORS.text.primary,
    marginLeft: SPACING.sm,
    flex: 1,
  },
  stepsList: {
    gap: SPACING.md,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.accent.yellow,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
    marginTop: 2,
  },
  stepNumberText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.background.primary,
  },
  stepText: {
    ...TEXT_STYLES.body,
    color: COLORS.text.secondary,
    flex: 1,
    lineHeight: 22,
  },

  // Contact form
  contactSection: {
    marginTop: SPACING.xl,
    backgroundColor: COLORS.background.secondary,
    borderRadius: 16,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: 'rgba(79, 195, 247, 0.15)',
  },
  contactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  contactTitle: {
    ...TEXT_STYLES.bodyMedium,
    color: COLORS.text.primary,
    marginLeft: SPACING.sm,
    flex: 1,
  },
  contactDescription: {
    ...TEXT_STYLES.body,
    color: COLORS.text.secondary,
    lineHeight: 22,
    marginBottom: SPACING.lg,
  },
  form: {
    gap: SPACING.md,
  },
  fieldLabel: {
    ...TEXT_STYLES.body,
    color: COLORS.text.secondary,
    fontSize: 14,
  },
  input: {
    backgroundColor: COLORS.background.primary,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border.default,
    paddingHorizontal: SPACING.md,
    paddingVertical: 12,
    color: COLORS.text.primary,
    fontSize: 15,
  },
  textArea: {
    minHeight: 100,
    paddingTop: 12,
  },
  subjectRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  subjectChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border.default,
    backgroundColor: COLORS.background.primary,
  },
  subjectChipActive: {
    borderColor: COLORS.accent.yellow,
    backgroundColor: 'rgba(255, 202, 40, 0.12)',
  },
  subjectChipText: {
    fontSize: 13,
    color: COLORS.text.secondary,
  },
  subjectChipTextActive: {
    color: COLORS.accent.yellow,
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: COLORS.accent.yellow,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.sm,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: COLORS.background.primary,
    fontSize: 16,
    fontWeight: '700',
  },
  successBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.3)',
    padding: SPACING.md,
  },
  successText: {
    ...TEXT_STYLES.body,
    color: COLORS.status.success,
    flex: 1,
    lineHeight: 22,
  },
});
