import { z } from "zod";

import { getSupabaseClient } from "@/lib/supabase";
import { createStoreSlug, merchantStoreSchema, type MerchantStoreFormValues } from "@/lib/merchant-validation";
import {
  groupMerchantOrderRows,
  type MerchantOrderRow
} from "@/lib/merchant-dashboard-state";
import {
  resolveMerchantAccessStatus,
  type MerchantAccessStatus
} from "@/lib/merchant-state";

const AccountTypeSchema = z.enum(["personal", "merchant"]);
const RoleRowsSchema = z.array(z.object({ role: z.string() }).passthrough());
const OwnedStoreSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string()
}).passthrough();

export type MerchantAccess = {
  userId: string;
  status: Exclude<MerchantAccessStatus, "signed_out">;
  store: { id: string; name: string; slug: string } | null;
};

export async function fetchMerchantAccess(): Promise<MerchantAccess | null> {
  const client = getSupabaseClient();
  const { data: authData, error: authError } = await client.auth.getUser();

  if (authError) throw authError;
  if (!authData.user) return null;

  const userId = authData.user.id;
  const [accountTypeResult, rolesResult, storeResult] = await Promise.all([
    client.rpc("get_my_account_type"),
    client.from("user_roles").select("role").eq("user_id", userId),
    client.from("stores").select("id, name, slug").eq("owner_id", userId).maybeSingle()
  ]);

  if (accountTypeResult.error) throw accountTypeResult.error;
  if (rolesResult.error) throw rolesResult.error;
  if (storeResult.error) throw storeResult.error;

  const accountType = AccountTypeSchema.parse(accountTypeResult.data as unknown);
  const roles = RoleRowsSchema.parse(rolesResult.data as unknown).map((row) => row.role);
  const store = storeResult.data
    ? OwnedStoreSchema.parse(storeResult.data as unknown)
    : null;

  const status = resolveMerchantAccessStatus({
    accountType,
    roles,
    hasOwnedStore: store !== null
  });

  return { userId, status, store };
}

const MerchantCategorySchema = z.object({
  id: z.string(),
  parent_id: z.string().nullable(),
  label_ar: z.string(),
  emoji: z.string().default("🛍️")
}).passthrough();

export type MerchantCategory = {
  id: string;
  parentId: string | null;
  label: string;
  emoji: string;
};

export async function fetchMerchantCategories(): Promise<MerchantCategory[]> {
  const { data, error } = await getSupabaseClient()
    .from("categories")
    .select("id, parent_id, label_ar, emoji")
    .eq("is_active", true)
    .order("sort_order");

  if (error) throw error;

  return MerchantCategorySchema.array().parse(data as unknown).map((category) => ({
    id: category.id,
    parentId: category.parent_id,
    label: category.label_ar,
    emoji: category.emoji
  }));
}

export async function createMerchantStore(
  input: MerchantStoreFormValues
): Promise<string> {
  const values = merchantStoreSchema.parse(input);
  if (values.wilayaId === null) throw new Error("merchantValidationWilaya");

  const client = getSupabaseClient();
  const { data: authData, error: authError } = await client.auth.getUser();
  if (authError) throw authError;
  if (!authData.user) throw new Error("not_authenticated");

  const suffix = Math.random().toString(36).slice(2, 8).padEnd(6, "0");
  const { data, error } = await client.rpc("create_my_store", {
    _store_name: values.storeName,
    _slug: createStoreSlug(values.storeName, suffix),
    _phone: values.phone,
    _whatsapp: values.whatsapp,
    _wilaya_id: values.wilayaId,
    _commune: values.commune,
    _address_line: values.addressLine,
    _latitude: null,
    _longitude: null,
    _opening_hours: {
      open: values.open,
      close: values.close,
      closed_days: []
    },
    _category: values.category,
    _subcategories: values.subcategories
  });

  if (error) throw new Error(`${error.code ?? ""} ${error.message}`.trim());
  return z.string().uuid().parse(data as unknown);
}


const MerchantDashboardStoreSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  phone: z.string().nullable(),
  commune: z.string().nullable(),
  logo_url: z.string().nullable(),
  is_verified: z.boolean(),
  rating: z.preprocess(
    (value: unknown) => value === null || value === undefined ? null : Number(value),
    z.number().nullable()
  )
}).passthrough();

const MerchantDashboardOrderItemSchema = z.object({
  id: z.string().uuid(),
  store_id: z.string().uuid(),
  merchant_archived_at: z.string().nullable(),
  product_name: z.string().nullable(),
  quantity: z.coerce.number()
}).passthrough();

const MerchantDashboardOrderRowSchema = z.object({
  id: z.string().uuid(),
  status: z.string(),
  subtotal: z.coerce.number(),
  shipping_fee: z.coerce.number().default(0),
  quoted_at: z.string().nullable().default(null),
  created_at: z.string(),
  order: z.object({
    id: z.string().uuid(),
    status: z.string(),
    full_name: z.string().nullable(),
    commune: z.string().nullable(),
    delivery_type: z.string(),
    created_at: z.string(),
    wilaya: z.object({ id: z.number(), name_ar: z.string().nullable(), name_fr: z.string().nullable() }).nullable(),
    daira: z.object({ name_ar: z.string(), name_fr: z.string().nullable() }).nullable().optional()
  }),
  items: z.array(MerchantDashboardOrderItemSchema)
}).passthrough();

export type MerchantDashboardStore = z.infer<typeof MerchantDashboardStoreSchema>;

export type MerchantDashboard = {
  store: MerchantDashboardStore;
  productCount: number;
  orders: ReturnType<typeof groupMerchantOrderRows>["orders"];
  pendingOrderCount: number;
  quotedOrderCount: number;
};

export async function fetchMerchantDashboard(storeId: string): Promise<MerchantDashboard> {
  const client = getSupabaseClient();
  const { data: authData, error: authError } = await client.auth.getUser();

  if (authError) throw authError;
  if (!authData.user) throw new Error("not_authenticated");

  const { data: storeData, error: storeError } = await client
    .from("stores")
    .select("id, name, slug, phone, commune, logo_url, is_verified, rating")
    .eq("id", storeId)
    .eq("owner_id", authData.user.id)
    .maybeSingle();

  if (storeError) throw storeError;
  if (!storeData) throw new Error("merchant_store_not_found");

  const [offerCountResult, orderItemsResult] = await Promise.all([
    client
      .from("store_offers")
      .select("id", { count: "exact", head: true })
      .eq("store_id", storeId),
    client
      .from("merchant_orders")
      .select("id, status, subtotal, shipping_fee, quoted_at, created_at, order:orders!inner(id, status, full_name, commune, delivery_type, created_at, wilaya:wilayas(id, name_ar, name_fr)), items:order_items!inner(id, store_id, merchant_archived_at, product_name, quantity)")
      .eq("store_id", storeId)
      .eq("items.store_id", storeId)
      .is("items.merchant_archived_at", null)
      .order("created_at", { ascending: false })
      .limit(100)
  ]);

  if (offerCountResult.error) throw offerCountResult.error;
  if (orderItemsResult.error) throw orderItemsResult.error;

  const store = MerchantDashboardStoreSchema.parse(storeData as unknown);
  const dashboardOrders = MerchantDashboardOrderRowSchema.array().parse(orderItemsResult.data as unknown);
  const rows: MerchantOrderRow[] = dashboardOrders.flatMap((merchantOrder) =>
    merchantOrder.items.map((item) => ({
      id: item.id,
      product_name: item.product_name,
      quantity: item.quantity,
      merchant_order: {
        id: merchantOrder.id,
        status: merchantOrder.status,
        subtotal: merchantOrder.subtotal,
        shipping_fee: merchantOrder.shipping_fee,
        quoted_at: merchantOrder.quoted_at
      },
      order: merchantOrder.order
    }))
  );
  const summary = groupMerchantOrderRows(rows);

  return {
    store,
    productCount: offerCountResult.count ?? 0,
    orders: summary.orders,
    pendingOrderCount: summary.pendingCount,
    quotedOrderCount: summary.quotedCount
  };
}


const MerchantOrderDetailSchema = z.object({
  id: z.string().uuid(),
  order_id: z.string().uuid(),
  store_id: z.string().uuid(),
  status: z.string(),
  subtotal: z.coerce.number(),
  shipping_fee: z.coerce.number(),
  quoted_at: z.string().nullable(),
  payment_status: z.string(),
  paid_amount: z.coerce.number().nullable(),
  paid_at: z.string().nullable(),
  order: z.object({
    id: z.string().uuid(),
    status: z.string(),
    full_name: z.string().nullable(),
    phone: z.string().nullable(),
    commune: z.string().nullable(),
    wilaya_id: z.number().nullable(),
    address_line: z.string().nullable(),
    delivery_type: z.string(),
    payment_method: z.string().nullable(),
    created_at: z.string(),
    wilaya: z.object({ id: z.number(), name_ar: z.string().nullable(), name_fr: z.string().nullable() }).nullable()
  })
}).passthrough();

const MerchantOrderItemDetailSchema = z.object({
  id: z.string().uuid(),
  product_name: z.string().nullable(),
  quantity: z.coerce.number(),
  unit_price: z.coerce.number(),
  options: z.unknown().optional()
}).passthrough();

const MerchantShipmentSchema = z.object({
  id: z.string().uuid(),
  status: z.string(),
  fee: z.coerce.number().nullable().optional(),
  updated_at: z.string().nullable().optional(),
  notes: z.string().nullable().optional()
}).passthrough();

const MerchantTrackingEventSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["preparing", "ready_for_dispatch", "out_for_delivery", "delivered"]),
  note: z.string().nullable(),
  created_at: z.string()
}).passthrough();

export type MerchantOrderDetail = {
  merchantOrder: z.infer<typeof MerchantOrderDetailSchema>;
  items: z.infer<typeof MerchantOrderItemDetailSchema>[];
  shipment: z.infer<typeof MerchantShipmentSchema> | null;
  trackingEvents: MerchantTrackingEvent[];
};

export type MerchantTrackingEvent = z.infer<typeof MerchantTrackingEventSchema>;
export type MerchantTrackingStatus = "preparing" | "ready_for_dispatch" | "out_for_delivery" | "delivered";

export async function fetchMerchantOrderDetails(
  merchantOrderId: string,
  storeId: string
): Promise<MerchantOrderDetail> {
  const client = getSupabaseClient();
  const { data: authData, error: authError } = await client.auth.getUser();

  if (authError) throw authError;
  if (!authData.user) throw new Error("not_authenticated");

  const { data: ownedStore, error: storeError } = await client
    .from("stores")
    .select("id")
    .eq("id", storeId)
    .eq("owner_id", authData.user.id)
    .maybeSingle();

  if (storeError) throw storeError;
  if (!ownedStore) throw new Error("merchant_store_not_found");

  const { data: merchantOrderData, error: merchantOrderError } = await client
    .from("merchant_orders")
    .select("id, order_id, store_id, status, subtotal, shipping_fee, quoted_at, payment_status, paid_amount, paid_at, order:orders!inner(id, status, full_name, phone, commune, wilaya_id, address_line, delivery_type, payment_method, created_at, wilaya:wilayas(id, name_ar, name_fr), daira:country_regions!orders_daira_region_fkey(name_ar, name_fr))")
    .eq("id", merchantOrderId)
    .eq("store_id", storeId)
    .maybeSingle();

  if (merchantOrderError) throw merchantOrderError;
  if (!merchantOrderData) throw new Error("merchant_order_not_found");

  const merchantOrder = MerchantOrderDetailSchema.parse(merchantOrderData as unknown);
  const [itemsResult, shipmentResult, trackingEvents] = await Promise.all([
    client
      .from("order_items")
      .select("id, product_name, quantity, unit_price, options")
      .eq("merchant_order_id", merchantOrderId)
      .eq("store_id", storeId)
      .is("merchant_archived_at", null)
      .order("id", { ascending: true }),
    client
      .from("shipments")
      .select("id, status, fee, updated_at, notes")
      .eq("merchant_order_id", merchantOrderId)
      .maybeSingle(),
    fetchMerchantOrderTracking(merchantOrderId)
  ]);

  if (itemsResult.error) throw itemsResult.error;
  if (shipmentResult.error) throw shipmentResult.error;

  return {
    merchantOrder,
    items: MerchantOrderItemDetailSchema.array().parse(itemsResult.data as unknown),
    shipment: shipmentResult.data
      ? MerchantShipmentSchema.parse(shipmentResult.data as unknown)
      : null,
    trackingEvents: [...trackingEvents].sort((first, second) => Date.parse(first.created_at) - Date.parse(second.created_at))
  };
}

export async function submitMerchantOrderQuote(
  merchantOrderId: string,
  shippingFee: number
): Promise<void> {
  if (!Number.isInteger(shippingFee) || shippingFee < 0 || shippingFee > 1_000_000) {
    throw new Error("invalid_shipping_fee");
  }

  const { error } = await getSupabaseClient().rpc("merchant_submit_order_quote", {
    _merchant_order_id: merchantOrderId,
    _shipping_fee: shippingFee
  });

  if (error) throw error;
}

export async function rejectMerchantOrder(
  merchantOrderId: string,
  reason: string | null = null
): Promise<void> {
  const { error } = await getSupabaseClient().rpc("merchant_reject_order", {
    _merchant_order_id: merchantOrderId,
    _reason: reason
  });

  if (error) throw error;
}

export async function fetchMerchantOrderTracking(
  merchantOrderId: string
): Promise<MerchantTrackingEvent[]> {
  const { data, error } = await getSupabaseClient().rpc("fetch_merchant_order_tracking", {
    _merchant_order_id: merchantOrderId
  });

  if (error) throw error;
  return MerchantTrackingEventSchema.array().parse(data as unknown);
}

export async function updateMerchantOrderTracking(
  merchantOrderId: string,
  status: MerchantTrackingStatus
): Promise<void> {
  const { error } = await getSupabaseClient().rpc("merchant_update_order_tracking", {
    _merchant_order_id: merchantOrderId,
    _status: status,
    _note: null
  });

  if (error) throw error;
}

export async function collectMerchantOrderCod(merchantOrderId: string): Promise<void> {
  const { error } = await getSupabaseClient().rpc("collect_merchant_order_cod", {
    _merchant_order_id: merchantOrderId
  });

  if (error) throw error;
}

