import AsyncStorage from "@react-native-async-storage/async-storage";

import { addCartItem, EMPTY_CART, removeCartItem, sanitizeCart, setCartItemQuantity, type CartItem } from "@/lib/cart-state";

export const CART_QUERY_KEY = ["customer-cart"] as const;
const STORAGE_KEY = "arownd:cart";
const LEGACY_STORAGE_KEY = "sooqy:bag";

let cachedCart: CartItem[] = EMPTY_CART;
let initialized = false;
let pendingWrite: Promise<void> = Promise.resolve();

export async function getCart(): Promise<CartItem[]> {
  if (initialized) return cachedCart;
  const current = await AsyncStorage.getItem(STORAGE_KEY);
  const legacy = current === null ? await AsyncStorage.getItem(LEGACY_STORAGE_KEY) : null;
  const raw = current ?? legacy;
  if (raw) {
    try { cachedCart = sanitizeCart(JSON.parse(raw) as unknown); }
    catch { cachedCart = EMPTY_CART; }
  } else cachedCart = EMPTY_CART;
  if (current === null && legacy !== null) await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(cachedCart));
  initialized = true;
  return cachedCart;
}

async function persist(next: CartItem[]): Promise<CartItem[]> {
  cachedCart = next;
  const snapshot = next;
  pendingWrite = pendingWrite.catch(() => undefined).then(() => AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot)));
  await pendingWrite;
  return snapshot;
}

export async function addToCart(item: CartItem): Promise<CartItem[]> {
  await getCart();
  return persist(addCartItem(cachedCart, item));
}

export async function updateCartQuantity(lineKey: string, quantity: number): Promise<CartItem[]> {
  await getCart();
  return persist(setCartItemQuantity(cachedCart, lineKey, quantity));
}

export async function removeFromCart(lineKey: string): Promise<CartItem[]> {
  await getCart();
  return persist(removeCartItem(cachedCart, lineKey));
}

export async function clearCart(): Promise<CartItem[]> {
  await getCart();
  return persist(EMPTY_CART);
}
