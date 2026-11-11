import { normalizeCartOptions, type CartItem } from "@/lib/cart-state";

export const MAX_CHECKOUT_ITEMS = 30;

export type CheckoutIdentityInput = {
  items: CartItem[];
  deliveryType: "home" | "desk";
  wilayaId: number;
  dairaRegionId: number;
  commune: string;
  addressLine: string;
  fullName: string;
  phone: string;
};

export function normalizeCheckoutItems(items: CartItem[]): CartItem[] {
  return items
    .map((item) => ({
      ...item,
      options: Object.fromEntries(
        Object.entries(normalizeCartOptions(item.options)).sort(([a], [b]) => a.localeCompare(b))
      )
    }))
    .sort((a, b) =>
      a.offerId.localeCompare(b.offerId) ||
      JSON.stringify(a.options).localeCompare(JSON.stringify(b.options)) ||
      a.quantity - b.quantity
    );
}

export function checkoutRequestIdentity(input: CheckoutIdentityInput): string {
  const items = normalizeCheckoutItems(input.items).map((item) => ({
    offerId: item.offerId,
    quantity: item.quantity,
    options: Object.entries(item.options)
  }));
  return JSON.stringify({
    items,
    deliveryType: input.deliveryType,
    wilayaId: input.wilayaId,
    dairaRegionId: input.dairaRegionId,
    commune: input.commune.trim(),
    addressLine: input.addressLine.trim(),
    fullName: input.fullName.trim(),
    phone: input.phone.trim(),
    paymentMethod: "cod"
  });
}
