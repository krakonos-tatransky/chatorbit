/**
 * Language Selector Component
 *
 * Dropdown with flag emojis for selecting the app language.
 */

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Pressable,
  Animated,
} from 'react-native';
import { COLORS } from '../constants/colors';
import {
  useLanguage,
  LANGUAGE_DEFINITIONS,
  SUPPORTED_LANGUAGES,
  type LanguageCode,
} from '../i18n';

export const LanguageSelector: React.FC = () => {
  const { language, setLanguage, t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const currentLanguage = LANGUAGE_DEFINITIONS[language];

  const handleSelect = (langCode: LanguageCode) => {
    setLanguage(langCode);
    setIsOpen(false);
  };

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  return (
    <>
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <TouchableOpacity
          style={styles.button}
          onPress={() => setIsOpen(true)}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          activeOpacity={0.8}
          accessibilityLabel={t.languageSwitcher.buttonLabel}
        >
          <Text style={styles.flag} maxFontSizeMultiplier={1}>{currentLanguage.flagEmoji}</Text>
        </TouchableOpacity>
      </Animated.View>

      <Modal
        visible={isOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setIsOpen(false)}>
          <View style={styles.dropdown}>
            <Text style={styles.dropdownTitle} maxFontSizeMultiplier={1}>
              {t.languageSwitcher.dialogTitle}
            </Text>
            {SUPPORTED_LANGUAGES.map((langCode) => {
              const langDef = LANGUAGE_DEFINITIONS[langCode];
              const isSelected = langCode === language;

              return (
                <TouchableOpacity
                  key={langCode}
                  style={[
                    styles.option,
                    isSelected && styles.optionSelected,
                  ]}
                  onPress={() => handleSelect(langCode)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.optionFlag} maxFontSizeMultiplier={1}>{langDef.flagEmoji}</Text>
                  <View style={styles.optionTextContainer}>
                    <Text style={styles.optionLabel} maxFontSizeMultiplier={1}>{langDef.nativeLabel}</Text>
                    {langDef.nativeLabel !== langDef.label && (
                      <Text style={styles.optionSubLabel} maxFontSizeMultiplier={1}>{langDef.label}</Text>
                    )}
                  </View>
                  {isSelected && <Text style={styles.checkmark} maxFontSizeMultiplier={1}>✓</Text>}
                </TouchableOpacity>
              );
            })}
          </View>
        </Pressable>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  button: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(79, 195, 247, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(79, 195, 247, 0.3)',
  },
  flag: {
    fontSize: 20,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdown: {
    backgroundColor: '#0a1628',
    borderRadius: 16,
    padding: 20,
    minWidth: 260,
    borderWidth: 1,
    borderColor: 'rgba(79, 195, 247, 0.3)',
    shadowColor: '#4FC3F7',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
  },
  dropdownTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 16,
    textAlign: 'center',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  optionSelected: {
    backgroundColor: 'rgba(79, 195, 247, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(79, 195, 247, 0.4)',
  },
  optionFlag: {
    fontSize: 28,
    marginRight: 14,
  },
  optionTextContainer: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.text.primary,
  },
  optionSubLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
    marginTop: 2,
  },
  checkmark: {
    fontSize: 18,
    color: '#4FC3F7',
    fontWeight: '600',
  },
});
