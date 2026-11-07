import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  EMPTY_FAVORITES,
  getFavoritesStorageKey,
  parseFavorites,
  toggleFavoriteId,
  type FavoriteKind,
  type Favorites
} from "@/lib/favorites-state";
import { getSupabaseClient } from "@/lib/supabase";

const LEGACY_STORAGE_KEYS = ["arownd:favorites", "sooqy:favorites"] as const;

const cachedFavorites = new Map<string, Favorites>();
const initialization = new Map<string, Promise<Favorites>>();
const pendingWrites = new Map<string, Promise<void>>();

async function getStorageScope(): Promise<string | null> {
  const { data, error } = await getSupabaseClient().auth.getUser();
  if (error) throw error;
  return data.user?.id ?? null;
}

async function loadFavorites(userId: string | null): Promise<Favorites> {
  const scope = userId ?? "anonymous";
  const cached = cachedFavorites.get(scope);
  if (cached) return cached;

  const existingInitialization = initialization.get(scope);
  if (existingInitialization) return existingInitialization;

  const task = (async (): Promise<Favorites> => {
    const storageKey = getFavoritesStorageKey(userId);
    const current = await AsyncStorage.getItem(storageKey);
    let raw = current;

    // Old unscoped keys remain anonymous-only to avoid exposing one account's
    // local favorites to another account on a shared device.
    if (userId === null && raw === null) {
      for (const legacyKey of LEGACY_STORAGE_KEYS) {
        raw = await AsyncStorage.getItem(legacyKey);
        if (raw !== null) break;
      }
    }

    let favorites = EMPTY_FAVORITES;
    if (raw !== null) {
      try {
        favorites = parseFavorites(JSON.parse(raw) as unknown);
      } catch {
        favorites = EMPTY_FAVORITES;
      }
    }

    cachedFavorites.set(scope, favorites);
    if (current === null && raw !== null) {
      await AsyncStorage.setItem(storageKey, JSON.stringify(favorites));
      if (userId === null) {
        await Promise.all(LEGACY_STORAGE_KEYS.map((key) => AsyncStorage.removeItem(key)));
      }
    }
    return favorites;
  })();

  initialization.set(scope, task);
  try {
    return await task;
  } finally {
    initialization.delete(scope);
  }
}

export async function getFavorites(): Promise<Favorites> {
  return loadFavorites(await getStorageScope());
}

export async function toggleFavorite(kind: FavoriteKind, id: string): Promise<Favorites> {
  const userId = await getStorageScope();
  const scope = userId ?? "anonymous";
  const current = await loadFavorites(userId);
  const next = toggleFavoriteId(current, kind, id);
  cachedFavorites.set(scope, next);

  const previousWrite = pendingWrites.get(scope) ?? Promise.resolve();
  const nextWrite = previousWrite.catch(() => undefined).then(() =>
    AsyncStorage.setItem(getFavoritesStorageKey(userId), JSON.stringify(next))
  );
  pendingWrites.set(scope, nextWrite);
  await nextWrite;
  return next;
}
