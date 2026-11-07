import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  EMPTY_FAVORITES,
  parseFavorites,
  toggleFavoriteId,
  type FavoriteKind,
  type Favorites
} from "@/lib/favorites-state";

const STORAGE_KEY = "arownd:favorites";
const LEGACY_STORAGE_KEY = "sooqy:favorites";

let cachedFavorites: Favorites = EMPTY_FAVORITES;
let initialized = false;
let pendingWrite: Promise<void> = Promise.resolve();

export async function getFavorites(): Promise<Favorites> {
  if (initialized) return cachedFavorites;

  const current = await AsyncStorage.getItem(STORAGE_KEY);
  const legacy = current === null ? await AsyncStorage.getItem(LEGACY_STORAGE_KEY) : null;
  const raw = current ?? legacy;
  if (raw) {
    try {
      cachedFavorites = parseFavorites(JSON.parse(raw) as unknown);
    } catch {
      cachedFavorites = EMPTY_FAVORITES;
    }
  } else {
    cachedFavorites = EMPTY_FAVORITES;
  }

  if (current === null && legacy !== null) {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(cachedFavorites));
  }
  initialized = true;
  return cachedFavorites;
}

export async function toggleFavorite(kind: FavoriteKind, id: string): Promise<Favorites> {
  await getFavorites();
  cachedFavorites = toggleFavoriteId(cachedFavorites, kind, id);
  const snapshot = cachedFavorites;
  pendingWrite = pendingWrite.then(() =>
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot))
  );
  await pendingWrite;
  return snapshot;
}
