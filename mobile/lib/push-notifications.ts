import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

import { getSupabaseClient } from "@/lib/supabase";

const DEVICE_TOKEN_STORAGE_KEY = "arownd.push-device-token.v1";
const ANDROID_CHANNEL_ID = "arownd_updates";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false
  })
});

async function persistStoredDeviceToken(token: string): Promise<void> {
  if (Platform.OS === "android") {
    await SecureStore.setItemAsync(DEVICE_TOKEN_STORAGE_KEY, token);
    await AsyncStorage.removeItem(DEVICE_TOKEN_STORAGE_KEY);
    return;
  }
  await AsyncStorage.setItem(DEVICE_TOKEN_STORAGE_KEY, token);
}

async function getStoredDeviceToken(): Promise<string | null> {
  if (Platform.OS !== "android") {
    return AsyncStorage.getItem(DEVICE_TOKEN_STORAGE_KEY);
  }

  const secureToken = await SecureStore.getItemAsync(DEVICE_TOKEN_STORAGE_KEY);
  if (secureToken) return secureToken;

  const legacyToken = await AsyncStorage.getItem(DEVICE_TOKEN_STORAGE_KEY);
  if (!legacyToken) return null;

  await SecureStore.setItemAsync(DEVICE_TOKEN_STORAGE_KEY, legacyToken);
  await AsyncStorage.removeItem(DEVICE_TOKEN_STORAGE_KEY);
  return legacyToken;
}

async function removeStoredDeviceToken(): Promise<void> {
  if (Platform.OS === "android") {
    await SecureStore.deleteItemAsync(DEVICE_TOKEN_STORAGE_KEY);
  }
  await AsyncStorage.removeItem(DEVICE_TOKEN_STORAGE_KEY);
}

async function persistDeviceToken(token: string): Promise<void> {
  const platform = "android";
  const { error } = await getSupabaseClient().rpc("register_my_push_device", {
    _token: token,
    _platform: platform
  });
  if (error) throw error;
  await persistStoredDeviceToken(token);
}

export async function registerDeviceForPushNotifications(language: "ar" | "en"): Promise<void> {
  if (Platform.OS !== "android") return;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
      name: language === "ar" ? "تحديثات Arownd" : "Arownd updates",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FFF01F"
    });
  }

  let permission = await Notifications.getPermissionsAsync();
  if (!permission.granted) {
    permission = await Notifications.requestPermissionsAsync();
  }
  if (!permission.granted) return;

  const deviceToken = await Notifications.getDevicePushTokenAsync();
  await persistDeviceToken(deviceToken.data);
}

export function listenForPushTokenChanges(): Notifications.EventSubscription {
  return Notifications.addPushTokenListener((token) => {
    void persistDeviceToken(token.data).catch(() => {
      console.warn("[push-notifications] Token refresh registration failed.");
    });
  });
}

export async function unregisterCurrentPushDevice(): Promise<void> {
  const token = await getStoredDeviceToken();
  if (!token) return;

  const { error } = await getSupabaseClient().rpc("unregister_my_push_device", {
    _token: token
  });
  if (error) throw error;
  await removeStoredDeviceToken();
}
