import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLanguage } from './LanguageProvider';
import { COLORS } from '../constants/colors';
import type { LanguageCode } from './translations';

export function LanguageSwitcher() {
  const { language, setLanguage, translations, availableLanguages } = useLanguage();
  const [modalVisible, setModalVisible] = useState(false);

  const handleLanguageSelect = (code: LanguageCode) => {
    setLanguage(code);
    setModalVisible(false);
  };

  const currentDefinition = availableLanguages.find((lang) => lang.code === language);

  return (
    <>
      <Pressable style={styles.button} onPress={() => setModalVisible(true)}>
        <Text style={styles.buttonText}>
          {currentDefinition?.flagEmoji} {currentDefinition?.nativeLabel}
        </Text>
      </Pressable>

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setModalVisible(false)}>
          <View style={styles.modal} onStartShouldSetResponder={() => true}>
            <View style={styles.header}>
              <Text style={styles.title}>{translations.languageSwitcher.dialogTitle}</Text>
              <Pressable style={styles.closeButton} onPress={() => setModalVisible(false)}>
                <Text style={styles.closeText}>✕</Text>
              </Pressable>
            </View>

            <ScrollView style={styles.languageList}>
              {availableLanguages.map((lang) => (
                <Pressable
                  key={lang.code}
                  style={[styles.languageItem, lang.code === language && styles.languageItemActive]}
                  onPress={() => handleLanguageSelect(lang.code)}
                >
                  <Text style={styles.flagEmoji}>{lang.flagEmoji}</Text>
                  <View style={styles.languageTextContainer}>
                    <Text style={styles.languageLabel}>{lang.label}</Text>
                    <Text style={styles.languageNative}>{lang.nativeLabel}</Text>
                  </View>
                  {lang.code === language && <Text style={styles.checkmark}>✓</Text>}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.glowEdge,
    backgroundColor: 'rgba(6, 36, 92, 0.64)'
  },
  buttonText: {
    color: COLORS.ice,
    fontSize: 14,
    fontWeight: '600'
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24
  },
  modal: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: COLORS.abyss,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: COLORS.glowEdge,
    shadowColor: COLORS.cobaltShadow,
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.35,
    shadowRadius: 32,
    elevation: 12,
    maxHeight: '80%'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(111, 214, 255, 0.2)'
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.ice
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(111, 214, 255, 0.1)'
  },
  closeText: {
    color: COLORS.ice,
    fontSize: 18,
    fontWeight: '600'
  },
  languageList: {
    padding: 12
  },
  languageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    marginBottom: 8,
    backgroundColor: 'rgba(9, 64, 140, 0.3)',
    borderWidth: 1,
    borderColor: 'transparent'
  },
  languageItemActive: {
    backgroundColor: 'rgba(111, 231, 255, 0.15)',
    borderColor: COLORS.aurora
  },
  flagEmoji: {
    fontSize: 28,
    marginRight: 12
  },
  languageTextContainer: {
    flex: 1
  },
  languageLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.ice,
    marginBottom: 2
  },
  languageNative: {
    fontSize: 14,
    color: 'rgba(219, 237, 255, 0.7)'
  },
  checkmark: {
    fontSize: 20,
    color: COLORS.aurora,
    fontWeight: '700'
  }
});
