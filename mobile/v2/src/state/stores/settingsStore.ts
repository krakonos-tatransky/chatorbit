/**
 * Settings Store
 *
 * Manages app settings including background pattern selection.
 * Persists to AsyncStorage for local storage.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { PatternVariant } from '@/components/ui/BackgroundPattern';

/**
 * Settings state
 */
interface SettingsState {
  // Background pattern
  backgroundPattern: PatternVariant;
  patternSize: number;

  // App version / monetization
  // When true: paid version with no ads
  // When false: free version with ads (when AdMob is enabled)
  isPaidVersion: boolean;

  // Loading state (for initial hydration)
  isHydrated: boolean;
}

/**
 * Settings actions
 */
interface SettingsActions {
  /**
   * Set the background pattern variant
   */
  setBackgroundPattern: (pattern: PatternVariant) => void;

  /**
   * Set the pattern size
   */
  setPatternSize: (size: number) => void;

  /**
   * Set the paid version flag
   * When true: no ads (paid version)
   * When false: show ads (free version)
   */
  setIsPaidVersion: (isPaid: boolean) => void;

  /**
   * Mark store as hydrated (called after AsyncStorage loads)
   */
  setHydrated: (hydrated: boolean) => void;
}

/**
 * Settings store type
 */
type SettingsStore = SettingsState & SettingsActions;

/**
 * Default settings
 */
const defaultSettings: SettingsState = {
  backgroundPattern: 'bubbles',
  patternSize: 100,
  // Default to false (free version with ads)
  // Set to true for paid version (no ads)
  // TODO: When AdMob is linked to App Store, set this to false to enable ads
  isPaidVersion: true, // Currently true to disable ads until App Store linking
  isHydrated: false,
};

/**
 * Settings store with persistence
 */
export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      ...defaultSettings,

      setBackgroundPattern: (pattern) => {
        set({ backgroundPattern: pattern });
      },

      setPatternSize: (size) => {
        set({ patternSize: size });
      },

      setIsPaidVersion: (isPaid) => {
        set({ isPaidVersion: isPaid });
      },

      setHydrated: (hydrated) => {
        set({ isHydrated: hydrated });
      },
    }),
    {
      name: 'chatorbit-settings',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
      partialize: (state) => ({
        backgroundPattern: state.backgroundPattern,
        patternSize: state.patternSize,
        isPaidVersion: state.isPaidVersion,
      }),
    }
  )
);

/**
 * Selectors for common state slices
 */
export const selectBackgroundPattern = (state: SettingsStore) =>
  state.backgroundPattern;

export const selectPatternSize = (state: SettingsStore) => state.patternSize;

export const selectIsHydrated = (state: SettingsStore) => state.isHydrated;

export const selectBackgroundSettings = (state: SettingsStore) => ({
  pattern: state.backgroundPattern,
  size: state.patternSize,
});

export const selectIsPaidVersion = (state: SettingsStore) =>
  state.isPaidVersion;

/**
 * Helper to check if ads should be shown
 * Returns true if ads should be shown (free version)
 * Returns false if ads should NOT be shown (paid version)
 */
export const selectShouldShowAds = (state: SettingsStore) =>
  !state.isPaidVersion;
