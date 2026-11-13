import "react-native-url-polyfill/auto";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { secureSessionStorage } from "@/lib/secure-session-storage";

let client: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (client) return client;

  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !publishableKey) {
    throw new Error("SUPABASE_CONFIG_MISSING");
  }

  client = createClient(url, publishableKey, {
    auth: {
      storage: Platform.OS === "android" ? secureSessionStorage : AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
      flowType: "pkce"
    }
  });

  return client;
}