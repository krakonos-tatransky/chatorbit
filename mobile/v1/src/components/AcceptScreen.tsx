import React, { useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';

import { DEFAULT_TERMS_TEXT } from '../session/config';
import { COLORS } from '../constants/colors';
import { styles } from '../constants/styles';
import { useLanguage, LanguageSwitcher } from '../i18n';

export type AcceptScreenProps = { onAccept: () => void };

export const AcceptScreen: React.FC<AcceptScreenProps> = ({ onAccept }) => {
  const { translations } = useLanguage();
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
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <Text style={styles.logoText}>ChatOrbit</Text>
          <LanguageSwitcher />
        </View>
        <ScrollView
          style={styles.termsScroll}
          contentContainerStyle={styles.termsContent}
          onScroll={handleScroll}
          scrollEventThrottle={24}
        >
          <Text style={styles.termsText}>{DEFAULT_TERMS_TEXT}</Text>
        </ScrollView>
        <TouchableOpacity
          accessibilityRole="button"
          style={[styles.acceptButton, !acceptEnabled && styles.acceptButtonDisabled]}
          onPress={onAccept}
          disabled={!acceptEnabled}
        >
          <Text style={styles.acceptButtonLabel}>
            {acceptEnabled ? translations.termsModal.agree : translations.termsModal.helper}
          </Text>
        </TouchableOpacity>
      </LinearGradient>
    </LinearGradient>
  );
};
