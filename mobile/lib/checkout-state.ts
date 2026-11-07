import { normalizeCartOptions, type CartItem } from "@/lib/cart-state";

export type CheckoutIdentityInput = {
  items: CartItem[];
  deliveryType: "home" | "desk";
  wilayaId: number;
  commune: string;
  addressLine: string;
  fullName: string;
  phone: string;
};

export function checkoutRequestIdentity(input: CheckoutIdentityInput): string {
  const items = input.items
    .map((item) => ({
      offerId: item.offerId,
      quantity: item.quantity,
      options: Object.entries(normalizeCartOptions(item.options)).sort(([a], [b]) => a.localeCompare(b))
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
