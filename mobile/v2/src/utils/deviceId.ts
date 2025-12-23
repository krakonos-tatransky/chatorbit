/**
 * Device ID Utility
 *
 * Generates and persists a unique device identifier to distinguish
 * devices on the same network when joining sessions.
 */

import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';

const DEVICE_ID_KEY = 'chatorbit_device_id';

let cachedDeviceId: string | null = null;

/**
 * Get or create a unique device identifier
 */
export async function getDeviceId(): Promise<string> {
  if (cachedDeviceId) {
    return cachedDeviceId;
  }

  try {
    const storedId = await SecureStore.getItemAsync(DEVICE_ID_KEY);
    if (storedId) {
      cachedDeviceId = storedId;
      return storedId;
    }
  } catch (error) {
    console.warn('[DeviceId] Failed to read stored device ID:', error);
  }

  // Generate new device ID
  const newId = Crypto.randomUUID();
  cachedDeviceId = newId;

  try {
    await SecureStore.setItemAsync(DEVICE_ID_KEY, newId);
  } catch (error) {
    console.warn('[DeviceId] Failed to store device ID:', error);
  }

  return newId;
}
