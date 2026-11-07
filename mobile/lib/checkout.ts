import AsyncStorage from "@react-native-async-storage/async-storage";
import { z } from "zod";

import type { CartItem } from "@/lib/cart-state";
import { getSupabaseClient } from "@/lib/supabase";

const WilayaSchema = z.object({ id: z.number(), name_ar: z.string() });
export type Wilaya = z.infer<typeof WilayaSchema>;

const ProfileSchema = z.object({
  full_name: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  wilaya_id: z.number().nullable().optional(),
  commune: z.string().nullable().optional()
});

export type CheckoutProfile = z.infer<typeof ProfileSchema>;
export type CheckoutDeliveryType = "home" | "desk";

export async function fetchCheckoutWilayas(): Promise<Wilaya[]> {
  const { data, error } = await getSupabaseClient()
    .from("wilayas")
    .select("id, name_ar")
    .order("id");
  if (error) throw error;
  return WilayaSchema.array().parse(data as unknown);
}

export async function fetchCheckoutCommunes(wilayaId: number): Promise<string[]> {
  const { data, error } = await getSupabaseClient()
    .from("stores")
    .select("commune")
    .eq("wilaya_id", wilayaId)
    .not("commune", "is", null);
  if (error) throw error;
  return [...new Set(data.map((row) => row.commune).filter((value): value is string => typeof value === "string" && value.trim().length > 0))].sort((a, b) => a.localeCompare(b, "ar"));
}

export async function fetchCheckoutProfile(): Promise<CheckoutProfile | null> {
  const { data: authData, error: authError } = await getSupabaseClient().auth.getUser();
  if (authError) throw authError;
  if (!authData.user) return null;
  const { data, error } = await getSupabaseClient()
    .from("profiles")
    .select("full_name, phone, wilaya_id, commune")
    .eq("user_id", authData.user.id)
    .maybeSingle();
  if (error) throw error;
  return data ? ProfileSchema.parse(data as unknown) : null;
}

export type CheckoutInput = {
  userId: string;
  items: CartItem[];
  deliveryType: CheckoutDeliveryType;
  wilayaId: number;
  commune: string;
  addressLine: string;
  fullName: string;
  phone: string;
};

export function checkoutRequestIdentity(input: Omit<CheckoutInput, "userId">): string {
  const items = input.items
    .map((item) => ({
      offerId: item.offerId,
      quantity: item.quantity,
      options: Object.entries(item.options).sort(([a], [b]) => a.localeCompare(b))
    }))
    .sort((a, b) => a.offerId.localeCompare(b.offerId) || JSON.stringify(a.options).localeCompare(JSON.stringify(b.options)));
  return JSON.stringify({
    items,
    deliveryType: input.deliveryType,
    wilayaId: input.wilayaId,
    commune: input.commune.trim(),
    addressLine: input.addressLine.trim(),
    fullName: input.fullName.trim(),
    phone: input.phone.trim(),
    paymentMethod: "cod"
  });
}

function createUuid(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (token) => {
    const random = Math.floor(Math.random() * 16);
    return (token === "x" ? random : (random & 0x3) | 0x8).toString(16);
  });
}

async function getOrCreateIdempotencyKey(userId: string, identity: string): Promise<string> {
  const storageKey = "arownd:checkout-idempotency:" + userId;
  let entries: Record<string, string> = {};
  const raw = await AsyncStorage.getItem(storageKey);
  if (raw) {
    try {
      const parsed: unknown = JSON.parse(raw);
      if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
        entries = Object.fromEntries(Object.entries(parsed).filter(
          (entry): entry is [string, string] => typeof entry[1] === "string"
        ));
      }
    } catch {
      entries = {};
    }
  }
  const existing = entries[identity];
  if (existing) return existing;
  const next = { ...entries, [identity]: createUuid() };
  await AsyncStorage.setItem(storageKey, JSON.stringify(next));
  return next[identity];
}

async function removeIdempotencyKey(userId: string, identity: string): Promise<void> {
  const storageKey = "arownd:checkout-idempotency:" + userId;
  const raw = await AsyncStorage.getItem(storageKey);
  if (!raw) return;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return;
    const entries = Object.fromEntries(Object.entries(parsed).filter(
      (entry): entry is [string, string] => typeof entry[1] === "string" && entry[0] !== identity
    ));
    if (Object.keys(entries).length === 0) await AsyncStorage.removeItem(storageKey);
    else await AsyncStorage.setItem(storageKey, JSON.stringify(entries));
  } catch {
    await AsyncStorage.removeItem(storageKey);
  }
}

export async function submitCheckout(input: CheckoutInput): Promise<string> {
  if (!input.userId) throw new Error("not_authenticated");
  if (input.items.length === 0) throw new Error("empty_cart");
  const identity = checkoutRequestIdentity(input);
  const idempotencyKey = await getOrCreateIdempotencyKey(input.userId, identity);
  const { data, error } = await getSupabaseClient().rpc("create_order_with_delivery", {
    _items: input.items.map((item) => ({
      offer_id: item.offerId,
      quantity: item.quantity,
      options: item.options
    })),
    _delivery_type: input.deliveryType,
    _wilaya_id: input.wilayaId,
    _commune: input.commune.trim(),
    _address_line: input.addressLine.trim(),
    _full_name: input.fullName.trim(),
    _phone: input.phone.trim(),
    _payment_method: "cod",
    _receipt_url: null,
    _delivery_company_id: null,
    _idempotency_key: idempotencyKey
  });
  if (error) throw error;
  if (typeof data !== "string" || data.length === 0) throw new Error("order_confirmation_missing");
  return data;
}

export async function completeCheckout(input: CheckoutInput): Promise<void> {
  await removeIdempotencyKey(input.userId, checkoutRequestIdentity(input));
}
