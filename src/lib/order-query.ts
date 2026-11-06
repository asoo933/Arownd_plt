/**
 * Shared PostgREST selection for order details.
 * Merchant store data is required by customer pickup and per-store tracking UI.
 */
export const ORDER_DETAIL_SELECT = [
  "*,",
  "items:order_items(*, store:stores(id, name, phone, whatsapp)),",
  "merchant_orders(id, store_id, status, subtotal, shipping_fee, quoted_at, payment_status, paid_amount, paid_at, store:stores!merchant_orders_store_id_fkey(name, address_line, commune)),",
  "wilaya:wilayas(name_ar)",
].join(" ");
