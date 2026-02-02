/**
 * Report Abuse Screen Component
 *
 * Full-screen view for reporting abusive behavior:
 * 1. Warning stage - explains consequences
 * 2. Form stage - collect report details
 * 3. Success stage - confirmation
 *
 * Styled to match app's design system (like Help, Privacy screens)
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';
import { TEXT_STYLES } from '../constants/typography';
import { SPACING, RADIUS } from '../constants/spacing';
import { Button } from './ui/Button';
import { useTranslation } from '../i18n';

type Stage = 'warning' | 'form' | 'success';

export interface ReportAbuseFormValues {
  reporterEmail: string;
  summary: string;
  immediateThreat: boolean;
  involvesCriminalActivity: boolean;
  requiresFollowUp: boolean;
  additionalDetails: string;
}

interface ReportAbuseModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (values: ReportAbuseFormValues) => Promise<void>;
}

const INITIAL_VALUES: ReportAbuseFormValues = {
  reporterEmail: '',
  summary: '',
  immediateThreat: false,
  involvesCriminalActivity: false,
  requiresFollowUp: false,
  additionalDetails: '',
};

export const ReportAbuseModal: React.FC<ReportAbuseModalProps> = ({
  visible,
  onClose,
  onSubmit,
}) => {
  const t = useTranslation();
  const [stage, setStage] = useState<Stage>('warning');
  const [values, setValues] = useState<ReportAbuseFormValues>(INITIAL_VALUES);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset state when modal closes
  useEffect(() => {
    if (!visible) {
      setStage('warning');
      setValues(INITIAL_VALUES);
      setSubmitting(false);
      setError(null);
    }
  }, [visible]);

  const handleCheckboxToggle = useCallback((field: keyof ReportAbuseFormValues) => {
    setValues(prev => ({
      ...prev,
      [field]: !prev[field],
    }));
  }, []);

  const handleTextChange = useCallback((field: keyof ReportAbuseFormValues, text: string) => {
    setValues(prev => ({
      ...prev,
      [field]: text,
    }));
  }, []);

  const handleSubmit = useCallback(async () => {
    // Basic validation
    if (!values.reporterEmail.trim()) {
      setError(t.reportAbuse.emailLabel + ' is required');
      return;
    }
    if (!values.summary.trim() || values.summary.length < 10) {
      setError(t.reportAbuse.summaryLabel + ' must be at least 10 characters');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await onSubmit(values);
      setStage('success');
    } catch (err) {
      setError(err instanceof Error ? err.message : t.reportAbuse.submitError);
    } finally {
      setSubmitting(false);
    }
  }, [values, onSubmit, t]);

  const renderHeader = () => (
    <View style={styles.headerBar}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={onClose}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="chevron-back" size={28} color={COLORS.text.primary} />
      </TouchableOpacity>
      <Text style={styles.headerTitle} maxFontSizeMultiplier={1}>
        {t.reportAbuse.title || 'Report Abuse'}
      </Text>
      <View style={styles.headerSpacer} />
    </View>
  );

  const renderWarningStage = () => (
    <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
      <View style={styles.iconContainer}>
        <Ionicons name="warning" size={64} color={COLORS.status.error} />
      </View>

      <Text style={styles.pageTitle} maxFontSizeMultiplier={1}>
        {t.reportAbuse.warningTitle}
      </Text>

      <Text style={styles.description} maxFontSizeMultiplier={1}>
        {t.reportAbuse.warningDescription}
      </Text>

      <View style={styles.noteCard}>
        <Ionicons name="alert-circle" size={20} color={COLORS.accent.yellow} />
        <Text style={styles.noteText} maxFontSizeMultiplier={1}>
          {t.reportAbuse.warningNote}
        </Text>
      </View>

      <View style={styles.buttonRow}>
        <Button
          onPress={onClose}
          variant="secondary"
          style={styles.buttonHalf}
        >
          {t.common.cancel}
        </Button>
        <Button
          onPress={() => setStage('form')}
          variant="danger"
          style={styles.buttonHalf}
        >
          {t.reportAbuse.continueButton}
        </Button>
      </View>
    </ScrollView>
  );

  const renderFormStage = () => (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={true}
    >
      <Text style={styles.pageTitle} maxFontSizeMultiplier={1}>
        {t.reportAbuse.formTitle}
      </Text>
      <Text style={styles.formDescription} maxFontSizeMultiplier={1}>
        {t.reportAbuse.formDescription}
      </Text>

      {/* Email field */}
      <View style={styles.card}>
        <Text style={styles.label} maxFontSizeMultiplier={1}>
          {t.reportAbuse.emailLabel}
        </Text>
        <TextInput
          style={styles.input}
          value={values.reporterEmail}
          onChangeText={(text) => handleTextChange('reporterEmail', text)}
          placeholder={t.reportAbuse.emailPlaceholder}
          placeholderTextColor={COLORS.text.disabled}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          maxFontSizeMultiplier={1}
        />
      </View>

      {/* Summary field */}
      <View style={styles.card}>
        <Text style={styles.label} maxFontSizeMultiplier={1}>
          {t.reportAbuse.summaryLabel}
        </Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={values.summary}
          onChangeText={(text) => handleTextChange('summary', text)}
          placeholder={t.reportAbuse.summaryPlaceholder}
          placeholderTextColor={COLORS.text.disabled}
          multiline
          numberOfLines={4}
          maxLength={2000}
          textAlignVertical="top"
          maxFontSizeMultiplier={1}
        />
      </View>

      {/* Questionnaire */}
      <View style={styles.card}>
        <Text style={styles.cardTitle} maxFontSizeMultiplier={1}>
          {t.reportAbuse.questionnaireTitle}
        </Text>

        <TouchableOpacity
          style={styles.checkbox}
          onPress={() => handleCheckboxToggle('immediateThreat')}
          activeOpacity={0.7}
        >
          <View style={[styles.checkboxBox, values.immediateThreat && styles.checkboxChecked]}>
            {values.immediateThreat && (
              <Ionicons name="checkmark" size={16} color={COLORS.text.primary} />
            )}
          </View>
          <Text style={styles.checkboxLabel} maxFontSizeMultiplier={1}>
            {t.reportAbuse.immediateThreat}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.checkbox}
          onPress={() => handleCheckboxToggle('involvesCriminalActivity')}
          activeOpacity={0.7}
        >
          <View style={[styles.checkboxBox, values.involvesCriminalActivity && styles.checkboxChecked]}>
            {values.involvesCriminalActivity && (
              <Ionicons name="checkmark" size={16} color={COLORS.text.primary} />
            )}
          </View>
          <Text style={styles.checkboxLabel} maxFontSizeMultiplier={1}>
            {t.reportAbuse.criminalActivity}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.checkbox}
          onPress={() => handleCheckboxToggle('requiresFollowUp')}
          activeOpacity={0.7}
        >
          <View style={[styles.checkboxBox, values.requiresFollowUp && styles.checkboxChecked]}>
            {values.requiresFollowUp && (
              <Ionicons name="checkmark" size={16} color={COLORS.text.primary} />
            )}
          </View>
          <Text style={styles.checkboxLabel} maxFontSizeMultiplier={1}>
            {t.reportAbuse.followUp}
          </Text>
        </TouchableOpacity>

        {/* Additional details */}
        <View style={styles.additionalField}>
          <Text style={styles.label} maxFontSizeMultiplier={1}>
            {t.reportAbuse.additionalDetailsLabel}
          </Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={values.additionalDetails}
            onChangeText={(text) => handleTextChange('additionalDetails', text)}
            placeholder={t.reportAbuse.additionalDetailsPlaceholder}
            placeholderTextColor={COLORS.text.disabled}
            multiline
            numberOfLines={3}
            maxLength={4000}
            textAlignVertical="top"
            maxFontSizeMultiplier={1}
          />
        </View>
      </View>

      {/* Error message */}
      {error && (
        <View style={styles.errorCard}>
          <Ionicons name="alert-circle" size={20} color={COLORS.status.error} />
          <Text style={styles.errorText} maxFontSizeMultiplier={1}>{error}</Text>
        </View>
      )}

      {/* Action buttons */}
      <View style={styles.buttonRow}>
        <Button
          onPress={onClose}
          variant="secondary"
          style={styles.buttonHalf}
          disabled={submitting}
        >
          {t.common.cancel}
        </Button>
        <Button
          onPress={handleSubmit}
          variant="danger"
          style={styles.buttonHalf}
          disabled={submitting}
        >
          {submitting ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={COLORS.text.primary} />
              <Text style={styles.buttonText} maxFontSizeMultiplier={1}>
                {t.reportAbuse.submitting}
              </Text>
            </View>
          ) : (
            t.reportAbuse.submitButton
          )}
        </Button>
      </View>

      {/* Bottom spacing for keyboard */}
      <View style={styles.bottomSpacer} />
    </ScrollView>
  );

  const renderSuccessStage = () => (
    <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
      <View style={styles.iconContainer}>
        <Ionicons name="checkmark-circle" size={64} color={COLORS.accent.yellow} />
      </View>

      <Text style={styles.pageTitle} maxFontSizeMultiplier={1}>
        {t.reportAbuse.successTitle}
      </Text>

      <Text style={styles.description} maxFontSizeMultiplier={1}>
        {t.reportAbuse.successDescription}
      </Text>

      <Button
        onPress={onClose}
        fullWidth
        style={styles.closeButton}
      >
        {t.common.close}
      </Button>
    </ScrollView>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          {renderHeader()}
          {stage === 'warning' && renderWarningStage()}
          {stage === 'form' && renderFormStage()}
          {stage === 'success' && renderSuccessStage()}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
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
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: 'rgba(2, 6, 23, 0.85)',
  },
  backButton: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text.primary,
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 48,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xl,
  },
  iconContainer: {
    alignItems: 'center',
    marginTop: SPACING.xl,
    marginBottom: SPACING.md,
  },
  pageTitle: {
    ...TEXT_STYLES.h2,
    color: COLORS.accent.yellow,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  description: {
    ...TEXT_STYLES.body,
    color: COLORS.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: SPACING.lg,
  },
  formDescription: {
    ...TEXT_STYLES.caption,
    color: COLORS.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: SPACING.lg,
  },
  noteCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.background.secondary,
    padding: SPACING.md,
    borderRadius: 12,
    marginBottom: SPACING.lg,
    gap: SPACING.sm,
    borderWidth: 1,
    borderColor: 'rgba(255, 193, 7, 0.2)',
  },
  noteText: {
    ...TEXT_STYLES.caption,
    color: COLORS.accent.yellow,
    flex: 1,
    lineHeight: 18,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  buttonHalf: {
    flex: 1,
  },
  card: {
    backgroundColor: COLORS.background.secondary,
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: 'rgba(79, 195, 247, 0.1)',
  },
  cardTitle: {
    ...TEXT_STYLES.bodyMedium,
    color: COLORS.text.primary,
    marginBottom: SPACING.md,
  },
  label: {
    ...TEXT_STYLES.caption,
    color: COLORS.text.secondary,
    marginBottom: SPACING.xs,
  },
  input: {
    backgroundColor: COLORS.background.primary,
    borderWidth: 1,
    borderColor: COLORS.border.default,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    color: COLORS.text.primary,
    fontSize: 14,
  },
  textArea: {
    minHeight: 100,
    paddingTop: SPACING.md,
  },
  checkbox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  checkboxBox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: COLORS.border.default,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: COLORS.status.info,
    borderColor: COLORS.status.info,
  },
  checkboxLabel: {
    ...TEXT_STYLES.body,
    color: COLORS.text.primary,
    flex: 1,
    lineHeight: 22,
  },
  additionalField: {
    marginTop: SPACING.sm,
  },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background.secondary,
    padding: SPACING.md,
    borderRadius: 12,
    marginBottom: SPACING.md,
    gap: SPACING.sm,
    borderWidth: 1,
    borderColor: 'rgba(239, 71, 111, 0.3)',
  },
  errorText: {
    ...TEXT_STYLES.caption,
    color: COLORS.status.error,
    flex: 1,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    width: '100%',
  },
  buttonText: {
    color: COLORS.text.primary,
    fontSize: 14,
    fontWeight: '600',
    flexShrink: 1,
  },
  closeButton: {
    marginTop: SPACING.md,
  },
  bottomSpacer: {
    height: 40,
  },
});
