export type DeliveryType = "home" | "desk";

/** Home delivery needs a customer address; store pickup uses the store address. */
export function requiresDeliveryAddress(deliveryType: DeliveryType): boolean {
  return deliveryType === "home";
}

/** Carrier-assigned home deliveries stay on the carrier workflow. */
export function isMerchantManagedDelivery(
  deliveryType: string,
  carrierAssigned: boolean,
): boolean {
  if (deliveryType === "desk") return true;
  if (deliveryType === "home") return !carrierAssigned;
  return false;
}

/** رسوم التوصيل حسب الولاية — نفس المنطق السابق، منقول للاستخدام المشترك بين السلة والدفع */
export function getShippingFee(wilayaId: number, deliveryType: DeliveryType) {
  if (deliveryType === "desk") return 0;
  const base = { 1: 800, 2: 900 } as Record<number, number>;
  const amount = base[wilayaId] ?? 700;
  return amount + 100;
}
