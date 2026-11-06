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
