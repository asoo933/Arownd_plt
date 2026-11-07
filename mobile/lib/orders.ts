import { z } from "zod";

import { getSupabaseClient } from "@/lib/supabase";

const OrderItemSchema = z.object({
  id: z.string(),
  product_name: z.string().nullable().optional(),
  quantity: z.coerce.number(),
  unit_price: z.coerce.number(),
  options: z.unknown().optional()
}).passthrough();

const StoreSchema = z.object({
  name: z.string().nullable().optional(),
  address_line: z.string().nullable().optional(),
  commune: z.string().nullable().optional()
}).passthrough();

const MerchantOrderSchema = z.object({
  id: z.string(),
  store_id: z.string(),
  status: z.string(),
  subtotal: z.coerce.number(),
  shipping_fee: z.coerce.number().default(0),
  quoted_at: z.string().nullable().optional(),
  payment_status: z.string().nullable().optional(),
  paid_amount: z.coerce.number().nullable().optional(),
  paid_at: z.string().nullable().optional(),
  store: StoreSchema.nullable().optional(),
  items: z.array(OrderItemSchema).default([])
}).passthrough();

const TrackingEventSchema = z.object({
  id: z.string(),
  status: z.string(),
  note: z.string().nullable().optional(),
  created_at: z.string()
}).passthrough();

const ShipmentSchema = z.object({
  id: z.string(),
  status: z.string(),
  notes: z.string().nullable().optional(),
  updated_at: z.string().nullable().optional(),
  created_at: z.string().nullable().optional(),
  merchant_order_id: z.string().nullable().optional()
}).passthrough();

const OrderSchema = z.object({
  id: z.string(),
  created_at: z.string(),
  status: z.string(),
  total: z.coerce.number(),
  subtotal: z.coerce.number().default(0),
  shipping_fee: z.coerce.number().default(0),
  delivery_type: z.string(),
  full_name: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  address_line: z.string().nullable().optional(),
  commune: z.string().nullable().optional(),
  wilaya_id: z.number().nullable().optional(),
  payment_method: z.string().nullable().optional(),
  wilaya: z.object({ name_ar: z.string().nullable() }).nullable().optional(),
  items: z.array(OrderItemSchema).default([]),
  merchant_orders: z.array(MerchantOrderSchema).default([])
}).passthrough();

export type CustomerOrder = z.infer<typeof OrderSchema>;
export type CustomerMerchantOrder = z.infer<typeof MerchantOrderSchema>;
export type CustomerOrderItem = z.infer<typeof OrderItemSchema>;
export type CustomerShipment = z.infer<typeof ShipmentSchema>;
export type CustomerTrackingEvent = z.infer<typeof TrackingEventSchema>;

const ORDER_SELECT = [
  "*,",
  "items:order_items(*),",
  "merchant_orders(id, order_id, store_id, status, subtotal, shipping_fee, quoted_at, payment_status, paid_amount, paid_at, store:stores(name, address_line, commune), items:order_items(*)),",
  "wilaya:wilayas(name_ar)"
].join(" ");

export async function fetchMyOrders(): Promise<CustomerOrder[]> {
  const { data: auth, error: authError } = await getSupabaseClient().auth.getUser();
  if (authError) throw authError;
  if (!auth.user) return [];
  const { data, error } = await getSupabaseClient()
    .from("orders")
    .select(ORDER_SELECT)
    .eq("user_id", auth.user.id)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return OrderSchema.array().parse(data as unknown);
}

export async function fetchCustomerOrderDetails(orderId: string): Promise<{
  order: CustomerOrder | null;
  shipments: CustomerShipment[];
  trackingEvents: { merchantOrderId: string; events: CustomerTrackingEvent[] }[];
}> {
  const { data: auth, error: authError } = await getSupabaseClient().auth.getUser();
  if (authError) throw authError;
  if (!auth.user) throw new Error("not_authenticated");
  const client = getSupabaseClient();
  const [{ data: order, error: orderError }, { data: shipments, error: shipmentError }] = await Promise.all([
    client.from("orders").select(ORDER_SELECT).eq("id", orderId).eq("user_id", auth.user.id).maybeSingle(),
    client.from("shipments").select("id, status, notes, updated_at, created_at, merchant_order_id").eq("order_id", orderId).order("created_at", { ascending: true })
  ]);
  if (orderError) throw orderError;
  if (shipmentError) throw shipmentError;
  const parsedOrder = order ? OrderSchema.parse(order as unknown) : null;
  const trackingEvents = parsedOrder
    ? await Promise.all(parsedOrder.merchant_orders.map(async (merchantOrder) => {
        const call = client.rpc.bind(client) as unknown as (
          functionName: string,
          args: { _merchant_order_id: string }
        ) => Promise<{ data: unknown; error: { message?: string } | null }>;
        const { data, error } = await call("fetch_merchant_order_tracking", {
          _merchant_order_id: merchantOrder.id
        });
        if (error) throw new Error(error.message ?? "order_tracking_load_failed");
        return {
          merchantOrderId: merchantOrder.id,
          events: TrackingEventSchema.array().parse(data as unknown)
        };
      }))
    : [];
  return {
    order: parsedOrder,
    shipments: ShipmentSchema.array().parse(shipments as unknown),
    trackingEvents
  };
}

export function getOrderTrackingSteps(status: string): number {
  switch (status) {
    case "pending": return 0;
    case "quoted": return 0;
    case "confirmed": return 1;
    case "shipped": return 2;
    case "delivered": return 3;
    default: return -1;
  }
}

export function getOrderStatusTone(status: string): "pending" | "success" | "danger" | "muted" {
  if (status === "delivered") return "success";
  if (status === "cancelled" || status === "rejected" || status === "failed" || status === "returned") return "danger";
  if (status === "pending" || status === "quoted") return "pending";
  return "muted";
}
