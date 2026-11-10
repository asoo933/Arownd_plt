import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import { getSupabaseClient } from "@/lib/supabase";

const DEVICE_TOKEN_STORAGE_KEY = "arownd.push-device-token.v1";
const ANDROID_CHANNEL_ID = "arownd_updates_v2";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false
  })
});

async function persistDeviceToken(token: string): Promise<void> {
  const platform = Platform.OS === "ios" ? "ios" : "android";
  const { error } = await getSupabaseClient().rpc("register_my_push_device", {
    _token: token,
    _platform: platform
  });
  if (error) throw error;
  await AsyncStorage.setItem(DEVICE_TOKEN_STORAGE_KEY, token);
}

export async function registerDeviceForPushNotifications(): Promise<void> {
  if (Platform.OS !== "android" && Platform.OS !== "ios") return;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
      name: "تحديثات Arownd",
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
    void persistDeviceToken(token.data).catch((error: unknown) => {
      console.warn("[push-notifications] Token refresh registration failed", error);
    });
  });
}

export async function unregisterCurrentPushDevice(): Promise<void> {
  const token = await AsyncStorage.getItem(DEVICE_TOKEN_STORAGE_KEY);
  if (!token) return;

  const { error } = await getSupabaseClient().rpc("unregister_my_push_device", {
    _token: token
  });
  if (error) throw error;
  await AsyncStorage.removeItem(DEVICE_TOKEN_STORAGE_KEY);
}
