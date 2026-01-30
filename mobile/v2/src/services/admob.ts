/**
 * AdMob Service
 *
 * Handles Google AdMob rewarded ads for token generation.
 * Users watch an ad to generate a free token.
 */

import mobileAds, {
  RewardedAd,
  RewardedAdEventType,
  TestIds,
  AdEventType,
} from 'react-native-google-mobile-ads';

// Ad Unit IDs
// Use test IDs in development, real IDs in production
const REWARDED_AD_UNIT_ID = __DEV__
  ? TestIds.REWARDED
  : 'ca-app-pub-2071726038718700/1971547745';

// Test device IDs - add your device IDs here after getting them from console
// The SDK will log the device ID when running on a physical device
const TEST_DEVICE_IDS = [
  'EMULATOR',
  // Add your test device IDs here after first run
  // e.g., '2077ef9a63d2b398840261c8221a0c9b'
];

let isInitialized = false;
let isInitializing = false;
let rewardedAd: RewardedAd | null = null;

/**
 * Initialize the AdMob SDK
 * Should be called once at app startup
 */
export async function initializeAdMob(): Promise<void> {
  if (isInitialized || isInitializing) {
    console.log('[AdMob] Already initialized or initializing');
    return;
  }

  isInitializing = true;

  try {
    console.log('[AdMob] Starting initialization...');

    // Configure test devices
    await mobileAds().setRequestConfiguration({
      testDeviceIdentifiers: TEST_DEVICE_IDS,
    });

    // Initialize the SDK
    const adapterStatuses = await mobileAds().initialize();
    console.log('[AdMob] Initialized successfully');
    console.log('[AdMob] Adapter statuses:', JSON.stringify(adapterStatuses, null, 2));

    isInitialized = true;

    // Delay preloading the first ad to let the app fully render
    setTimeout(() => {
      preloadRewardedAd();
    }, 2000);
  } catch (error) {
    console.error('[AdMob] Initialization failed:', error);
    // Don't throw - let the app continue without ads
  } finally {
    isInitializing = false;
  }
}

/**
 * Preload a rewarded ad so it's ready when needed
 */
export function preloadRewardedAd(): void {
  if (!isInitialized) {
    console.log('[AdMob] Not initialized yet, skipping preload');
    return;
  }

  if (rewardedAd) {
    console.log('[AdMob] Rewarded ad already loaded or loading');
    return;
  }

  try {
    console.log('[AdMob] Preloading rewarded ad...');
    console.log('[AdMob] Using ad unit ID:', REWARDED_AD_UNIT_ID);

    rewardedAd = RewardedAd.createForAdRequest(REWARDED_AD_UNIT_ID, {
      keywords: ['chat', 'communication', 'privacy', 'messaging'],
    });

    // Listen for load event
    rewardedAd.addAdEventListener(RewardedAdEventType.LOADED, () => {
      console.log('[AdMob] Rewarded ad loaded and ready');
    });

    // Listen for errors
    rewardedAd.addAdEventListener(AdEventType.ERROR, (error) => {
      console.error('[AdMob] Rewarded ad failed to load:', error);
      // Clear the ad so we can try again
      rewardedAd = null;
    });

    // Listen for ad closed
    rewardedAd.addAdEventListener(AdEventType.CLOSED, () => {
      console.log('[AdMob] Rewarded ad closed');
      // Preload the next ad
      rewardedAd = null;
      setTimeout(() => preloadRewardedAd(), 1000);
    });

    // Start loading
    rewardedAd.load();
  } catch (error) {
    console.error('[AdMob] Error creating rewarded ad:', error);
    rewardedAd = null;
  }
}

/**
 * Check if a rewarded ad is ready to show
 */
export function isRewardedAdReady(): boolean {
  return rewardedAd?.loaded ?? false;
}

/**
 * Show a rewarded ad and return a promise that resolves when the user earns the reward
 * @returns Promise that resolves with true if reward earned, false if cancelled/failed
 */
export function showRewardedAd(): Promise<boolean> {
  return new Promise((resolve) => {
    if (!rewardedAd || !rewardedAd.loaded) {
      console.log('[AdMob] No rewarded ad ready');
      resolve(false);
      return;
    }

    let rewardEarned = false;

    // Listen for reward earned
    const unsubscribeEarned = rewardedAd.addAdEventListener(
      RewardedAdEventType.EARNED_REWARD,
      (reward) => {
        console.log('[AdMob] User earned reward:', reward);
        rewardEarned = true;
      }
    );

    // Listen for ad closed
    const unsubscribeClosed = rewardedAd.addAdEventListener(
      AdEventType.CLOSED,
      () => {
        console.log('[AdMob] Ad closed, reward earned:', rewardEarned);
        unsubscribeEarned();
        unsubscribeClosed();

        // Clear the ad reference so we can preload a new one
        rewardedAd = null;

        // Resolve with whether reward was earned
        resolve(rewardEarned);

        // Preload next ad
        setTimeout(() => preloadRewardedAd(), 1000);
      }
    );

    // Show the ad
    console.log('[AdMob] Showing rewarded ad...');
    rewardedAd.show();
  });
}

/**
 * Get the current ad ready state for UI updates
 */
export function getAdState(): { isReady: boolean; isLoading: boolean } {
  return {
    isReady: rewardedAd?.loaded ?? false,
    isLoading: rewardedAd !== null && !rewardedAd.loaded,
  };
}
