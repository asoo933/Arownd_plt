import { z } from "zod";

import { getSupabaseClient } from "@/lib/supabase";
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
  input: import("@/lib/merchant-validation").MerchantStoreFormValues
): Promise<string> {
  const { merchantStoreSchema, createStoreSlug } = await import("@/lib/merchant-validation");
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
