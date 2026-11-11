export type MerchantOrderRow = {
  id: string;
  product_name: string | null;
  quantity: number;
  merchant_order: {
    id: string;
    status: string;
    subtotal: number;
    shipping_fee: number;
    quoted_at: string | null;
  };
  order: {
    id: string;
    status: string;
    full_name: string | null;
    commune: string | null;
    delivery_type: string;
    created_at: string;
    country_code: string;
    currency_code: string;
    region: { name_ar: string; name_fr: string | null; name_en: string | null } | null;
    secondary_region: { name_ar: string; name_fr: string | null; name_en: string | null } | null;
    wilaya?: { id: number; name_ar: string | null; name_fr: string | null } | null;
  } | null;
};

export type MerchantDashboardOrder = {
  id: string;
  parentOrderId: string;
  status: string;
  subtotal: number;
  shippingFee: number;
  quotedAt: string | null;
  createdAt: string;
  customerName: string;
  commune: string;
  wilayaName: string;
  wilayaId: number | null;
  wilayaNameFr: string;
  currencyCode: string;
  deliveryType: string;
  itemCount: number;
  totalQuantity: number;
  productNames: string[];
};

export type MerchantOrderSummary = {
  orders: MerchantDashboardOrder[];
  pendingCount: number;
  quotedCount: number;
};

export function groupMerchantOrderRows(rows: MerchantOrderRow[]): MerchantOrderSummary {
  const groups = new Map<string, MerchantDashboardOrder>();

  for (const row of rows) {
    const parentOrder = row.order;
    if (!parentOrder) continue;

    const merchantOrder = row.merchant_order;
    const existing = groups.get(merchantOrder.id);
    const productName = row.product_name?.trim() ?? "";

    if (existing) {
      existing.itemCount += 1;
      existing.totalQuantity += row.quantity;
      if (productName && !existing.productNames.includes(productName)) {
        existing.productNames.push(productName);
      }
      continue;
    }

    groups.set(merchantOrder.id, {
      id: merchantOrder.id,
      parentOrderId: parentOrder.id,
      status: parentOrder.status === "cancelled" ? "cancelled" : merchantOrder.status,
      subtotal: merchantOrder.subtotal,
      shippingFee: merchantOrder.shipping_fee,
      quotedAt: merchantOrder.quoted_at,
      createdAt: parentOrder.created_at,
      customerName: parentOrder.full_name?.trim() ?? "",
      commune: parentOrder.commune?.trim() ?? "",
      wilayaName: [parentOrder.region?.name_ar ?? parentOrder.wilaya?.name_ar ?? "", parentOrder.secondary_region?.name_ar ?? ""].filter(Boolean).join("، "),
      wilayaId: parentOrder.wilaya?.id ?? null,
      wilayaNameFr: [parentOrder.region?.name_fr ?? parentOrder.region?.name_en ?? parentOrder.wilaya?.name_fr ?? "", parentOrder.secondary_region?.name_fr ?? parentOrder.secondary_region?.name_en ?? ""].filter(Boolean).join(", "),
      currencyCode: parentOrder.currency_code,
      deliveryType: parentOrder.delivery_type,
      itemCount: 1,
      totalQuantity: row.quantity,
      productNames: productName ? [productName] : []
    });
  }

  const orders = [...groups.values()].sort(
    (first, second) => Date.parse(second.createdAt) - Date.parse(first.createdAt)
  );

  return {
    orders,
    pendingCount: orders.filter((order) => order.status === "pending").length,
    quotedCount: orders.filter((order) => order.status === "quoted").length
  };
}

export type MerchantOrderNextStatus = "shipped" | "delivered";

export function getNextMerchantOrderStatus(
  currentStatus: string,
  deliveryType: string
): MerchantOrderNextStatus | null {
  if (currentStatus === "confirmed") return "shipped";
  if (currentStatus === "shipped" && deliveryType === "desk") return "delivered";
  return null;
}

export type MerchantTrackingStep =
  | "preparing"
  | "ready_for_dispatch"
  | "out_for_delivery"
  | "delivered";

export function getNextMerchantTrackingStatus(
  currentStatus: string,
  deliveryType: string
): MerchantTrackingStep | null {
  if (currentStatus === "confirmed") return "preparing";
  if (currentStatus === "preparing") return "ready_for_dispatch";
  if (currentStatus === "ready_for_dispatch") {
    return deliveryType === "desk" ? "delivered" : deliveryType === "home" ? "out_for_delivery" : null;
  }
  if (currentStatus === "out_for_delivery" && deliveryType === "home") return "delivered";
  return null;
}


export function canManageMerchantOrderFulfillment(status: string): boolean {
  return status === "confirmed" || status === "shipped";
}

export function canCollectMerchantOrderCod(
  status: string,
  paymentStatus: string,
  deliveryType: string,
  hasAssignedCarrier: boolean
): boolean {
  if (status !== "delivered" || paymentStatus === "paid") return false;
  if (deliveryType === "desk") return true;
  return deliveryType === "home" && !hasAssignedCarrier;
}
