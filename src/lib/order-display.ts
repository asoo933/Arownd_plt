/**
 * Returns the amount that should be shown for one merchant suborder.
 * Cancelled suborders must not display a retained quote as payable.
 */
export function getMerchantOrderDisplayTotal(
  status: string,
  subtotal: number,
  shippingFee: number,
): number {
  return status === "cancelled" ? 0 : subtotal + shippingFee;
}


export type MerchantOrderDisplayState =
  | "awaiting_merchant"
  | "awaiting_customer"
  | "cancelled"
  | "tracking"
  | "unknown";

/** Maps merchant_orders.status to the customer-facing detail-page state. */
export function getMerchantOrderDisplayState(status: string): MerchantOrderDisplayState {
  switch (status) {
    case "pending":
      return "awaiting_merchant";
    case "quoted":
      return "awaiting_customer";
    case "cancelled":
    case "rejected":
      return "cancelled";
    case "confirmed":
    case "shipped":
    case "delivered":
      return "tracking";
    default:
      return "unknown";
  }
}
