import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";

/**
 * Supabase auth storage for Android.
 *
 * Existing AsyncStorage sessions are migrated lazily. The legacy value is only
 * removed after SecureStore confirms the write, so a failed migration does not
 * silently discard the user's session.
 */
export const secureSessionStorage = {
  async getItem(key: string): Promise<string | null> {
    const secureValue = await SecureStore.getItemAsync(key);

    if (secureValue !== null) {
      await AsyncStorage.removeItem(key);
      return secureValue;
    }

    const legacyValue = await AsyncStorage.getItem(key);
    if (legacyValue === null) return null;

    await SecureStore.setItemAsync(key, legacyValue);
    await AsyncStorage.removeItem(key);
    return legacyValue;
  },

  async setItem(key: string, value: string): Promise<void> {
    await SecureStore.setItemAsync(key, value);
    await AsyncStorage.removeItem(key);
  },

  async removeItem(key: string): Promise<void> {
    await SecureStore.deleteItemAsync(key);
    await AsyncStorage.removeItem(key);
  }
};
