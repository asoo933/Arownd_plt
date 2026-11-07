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

const AccountTypeSchema = z.enum(["personal", "merchant", "delivery_company"]);
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
  label_ar: z.string()
}).passthrough();

export type MerchantCategory = {
  id: string;
  parentId: string | null;
  label: string;
};

export async function fetchMerchantCategories(): Promise<MerchantCategory[]> {
  const { data, error } = await getSupabaseClient()
    .from("categories")
    .select("id, parent_id, label_ar")
    .eq("is_active", true)
    .order("sort_order");

  if (error) throw error;

  return MerchantCategorySchema.array().parse(data as unknown).map((category) => ({
    id: category.id,
    parentId: category.parent_id,
    label: category.label_ar
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

const MerchantOrderRowSchema = z.object({
  id: z.string().uuid(),
  product_name: z.string().nullable(),
  quantity: z.coerce.number(),
  merchant_order: z.object({
    id: z.string().uuid(),
    status: z.string(),
    subtotal: z.coerce.number(),
    shipping_fee: z.coerce.number().default(0),
    quoted_at: z.string().nullable().default(null)
  }),
  order: z.object({
    id: z.string().uuid(),
    status: z.string(),
    full_name: z.string().nullable(),
    commune: z.string().nullable(),
    delivery_type: z.string(),
    created_at: z.string(),
    wilaya: z.object({ name_ar: z.string().nullable() }).nullable()
  }).nullable()
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
      .from("order_items")
      .select("id, product_name, quantity, merchant_order:merchant_orders!inner(id, status, subtotal, shipping_fee, quoted_at), order:orders(id, status, full_name, commune, delivery_type, created_at, wilaya:wilayas(name_ar))")
      .eq("store_id", storeId)
      .eq("merchant_order.store_id", storeId)
      .is("merchant_archived_at", null)
      .order("id", { ascending: false })
      .limit(100)
  ]);

  if (offerCountResult.error) throw offerCountResult.error;
  if (orderItemsResult.error) throw orderItemsResult.error;

  const store = MerchantDashboardStoreSchema.parse(storeData as unknown);
  const rows = MerchantOrderRowSchema.array().parse(orderItemsResult.data as unknown) as MerchantOrderRow[];
  const summary = groupMerchantOrderRows(rows);

  return {
    store,
    productCount: offerCountResult.count ?? 0,
    orders: summary.orders,
    pendingOrderCount: summary.pendingCount,
    quotedOrderCount: summary.quotedCount
  };
}
