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
    wilaya: { name_ar: string | null } | null;
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
    if (!parentOrder || parentOrder.status === "cancelled") continue;

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
      status: merchantOrder.status,
      subtotal: merchantOrder.subtotal,
      shippingFee: merchantOrder.shipping_fee,
      quotedAt: merchantOrder.quoted_at,
      createdAt: parentOrder.created_at,
      customerName: parentOrder.full_name?.trim() ?? "",
      commune: parentOrder.commune?.trim() ?? "",
      wilayaName: parentOrder.wilaya?.name_ar?.trim() ?? "",
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

export type MerchantTrackingStep =
  | "preparing"
  | "ready_for_dispatch"
  | "out_for_delivery"
  | "delivered";

const MERCHANT_TRACKING_SEQUENCE: readonly MerchantTrackingStep[] = [
  "preparing",
  "ready_for_dispatch",
  "out_for_delivery",
  "delivered"
];

export function getNextMerchantTrackingStatus(
  completedStatuses: readonly string[]
): MerchantTrackingStep | null {
  const lastStatus = completedStatuses[completedStatuses.length - 1];
  if (lastStatus && !MERCHANT_TRACKING_SEQUENCE.includes(lastStatus as MerchantTrackingStep)) {
    return null;
  }

  const nextIndex = lastStatus
    ? MERCHANT_TRACKING_SEQUENCE.findIndex((status) => status === lastStatus) + 1
    : 0;

  if (nextIndex >= MERCHANT_TRACKING_SEQUENCE.length) return null;
  return MERCHANT_TRACKING_SEQUENCE[nextIndex] ?? null;
}
