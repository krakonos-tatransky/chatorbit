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
