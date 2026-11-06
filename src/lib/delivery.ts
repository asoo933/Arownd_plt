import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type DeliveryCompany = Database["public"]["Tables"]["delivery_companies"]["Row"];
export type PublicDeliveryCompany =
  Database["public"]["Views"]["approved_delivery_companies"]["Row"];
export type DeliveryCompanyInsert = Pick<
  Database["public"]["Tables"]["delivery_companies"]["Insert"],
  "user_id" | "company_name" | "contact_name" | "contact_phone" | "email" | "license_number"
>;
export type DeliveryCompanyUpdate = Pick<
  Database["public"]["Tables"]["delivery_companies"]["Update"],
  "company_name" | "contact_name" | "contact_phone" | "email" | "license_number"
>;

export type DeliveryCoverageArea = Database["public"]["Tables"]["delivery_coverage_areas"]["Row"];
export type DeliveryService = Database["public"]["Tables"]["delivery_services"]["Row"];

export type Shipment = Database["public"]["Tables"]["shipments"]["Row"] & {
  cod_collection?: Pick<
    Database["public"]["Tables"]["merchant_order_cod_collections"]["Row"],
    "merchant_order_id" | "amount" | "collected_at"
  > | null;
};
export type ShipmentInsert = Database["public"]["Tables"]["shipments"]["Insert"];
export type ShipmentUpdate = Pick<Database["public"]["Tables"]["shipments"]["Update"], "status">;

export type ShipmentStatusLog = Database["public"]["Tables"]["shipment_status_logs"]["Row"];
export type ShipmentTracking = Database["public"]["Tables"]["shipment_tracking"]["Row"];

export type ShipmentStatus =
  | "pending"
  | "accepted"
  | "rejected"
  | "picked_up"
  | "in_transit"
  | "delivered"
  | "failed"
  | "returned";

export const SHIPMENT_STATUS_LABELS: Record<ShipmentStatus, string> = {
  pending: "قيد الانتظار",
  accepted: "مقبول",
  rejected: "مرفوض",
  picked_up: "تم الاستلام من المتجر",
  in_transit: "قيد التوصيل",
  delivered: "تم التسليم",
  failed: "تعذر التسليم",
  returned: "مرتجع",
};

// ---------- شركات التوصيل ----------

/** جلب جميع شركات التوصيل المعتمدة والنشطة. */
export async function fetchApprovedDeliveryCompanies(): Promise<PublicDeliveryCompany[]> {
  const { data, error } = await supabase
    .from("approved_delivery_companies")
    .select("*")
    .order("company_name");
  if (error) throw error;
  return data;
}

/** جلب شركة توصيل واحدة حسب المعرف. */
export async function fetchDeliveryCompanyById(id: string): Promise<PublicDeliveryCompany | null> {
  const { data, error } = await supabase
    .from("approved_delivery_companies")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/** جلب شركات التوصيل الخاصة بالمستخدم الحالي (لوحة الشركة). */
export async function fetchMyDeliveryCompany(userId: string): Promise<DeliveryCompany | null> {
  const { data, error } = await supabase
    .from("delivery_companies")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/** تسجيل شركة توصيل جديدة (تحت المراجعة حتى يتم اعتمادها من المشرف). */
export async function registerDeliveryCompany(
  payload: DeliveryCompanyInsert,
): Promise<DeliveryCompany> {
  const { data, error } = await supabase
    .from("delivery_companies")
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data;
}

/** تحديث بيانات شركة التوصيل. */
export async function updateDeliveryCompany(
  id: string,
  payload: DeliveryCompanyUpdate,
): Promise<DeliveryCompany> {
  const { data, error } = await supabase
    .from("delivery_companies")
    .update(payload)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ---------- مناطق التغطية والخدمات ----------

/** جلب مناطق التغطية لشركة توصيل. */
export async function fetchCoverageAreas(companyId: string): Promise<DeliveryCoverageArea[]> {
  const { data, error } = await supabase
    .from("delivery_coverage_areas")
    .select("*")
    .eq("company_id", companyId)
    .eq("is_active", true)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

/** جلب خدمات التوصيل لشركة توصيل. */
export async function fetchDeliveryServices(companyId: string): Promise<DeliveryService[]> {
  const { data, error } = await supabase
    .from("delivery_services")
    .select("*")
    .eq("company_id", companyId)
    .eq("is_active", true)
    .order("base_price");
  if (error) throw error;
  return data;
}

// ---------- طلبات الشحن ----------

/** إنشاء الشحنات يتم عبر RPC موثوق بعد موافقة المشتري؛ لا إدراج مباشر من العميل. */

/** جلب شحنة واحدة حسب المعرف. */
export async function fetchShipmentById(id: string): Promise<Shipment | null> {
  const { data, error } = await supabase.from("shipments").select("*").eq("id", id).single();
  if (error) throw error;
  return data;
}

/** Look up the optional carrier shipment for one merchant suborder. */
export async function fetchShipmentByMerchantOrderId(
  merchantOrderId: string,
): Promise<Shipment | null> {
  const { data, error } = await supabase
    .from("shipments")
    .select("*")
    .eq("merchant_order_id", merchantOrderId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/** جلب جميع شحنات الطلب؛ قد يحتوي الطلب الرئيسي على شحنة لكل متجر. */
export async function fetchShipmentsByOrderId(orderId: string): Promise<Shipment[]> {
  const { data, error } = await supabase
    .from("shipments")
    .select("*")
    .eq("order_id", orderId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data;
}

/** توافق خلفي للواجهات القديمة؛ استخدم fetchShipmentsByOrderId في التدفقات متعددة المتاجر. */
export async function fetchShipmentByOrderId(orderId: string): Promise<Shipment | null> {
  const shipments = await fetchShipmentsByOrderId(orderId);
  return shipments[0] ?? null;
}

/** شحنات التوصيل المنزلي التي تنتظر تعيين شركة من Arownd. */
export async function fetchUnassignedShipments() {
  const { data, error } = await supabase
    .from("shipments")
    .select("*, order:orders!inner(id, full_name, phone, commune, wilaya_id, delivery_type)")
    .or("company_id.is.null,status.eq.rejected")
    .in("status", ["pending", "rejected"])
    .eq("order.delivery_type", "home")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data;
}

/** مناطق التغطية النشطة التي يراجعها المشرف قبل إسناد الشحنة. */
export async function fetchDeliveryCoverageAreas(): Promise<DeliveryCoverageArea[]> {
  const { data, error } = await supabase
    .from("delivery_coverage_areas")
    .select("*")
    .eq("is_active", true);
  if (error) throw error;
  return data;
}


/** جلب جميع شحنات شركة توصيل (لللوحة). */
export async function fetchShipmentsByCompany(
  companyId: string,
): Promise<(Shipment & { order_id: string })[]> {
  const { data, error } = await supabase
    .from("shipments")
    .select("*, order:orders!inner(*)")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });
  if (error) throw error;

  const merchantOrderIds = data
    .map((shipment) => shipment.merchant_order_id)
    .filter((id): id is string => Boolean(id));

  const collections =
    merchantOrderIds.length > 0
      ? await supabase
          .from("merchant_order_cod_collections")
          .select("merchant_order_id, amount, collected_at")
          .in("merchant_order_id", merchantOrderIds)
      : { data: [], error: null };

  if (collections.error) throw collections.error;

  return data.map((shipment) => ({
    ...shipment,
    cod_collection:
      collections.data?.find(
        (collection) => collection.merchant_order_id === shipment.merchant_order_id,
      ) ?? null,
  }));
}

/** جلب الشحنات pending لشركة توصيل (طلبات جديدة تحتاج قرار). */
export async function fetchPendingShipmentsForCompany(companyId: string): Promise<Shipment[]> {
  const { data, error } = await supabase
    .from("shipments")
    .select("*")
    .eq("company_id", companyId)
    .eq("status", "pending")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data;
}

/** تحديث حالة الشحنة وسجلها في معاملة واحدة داخل قاعدة البيانات. */
export async function updateShipmentStatus(
  id: string,
  status: ShipmentStatus,
  note?: string,
): Promise<Shipment> {
  const { data, error } = await supabase.rpc("update_shipment_status", {
    _shipment_id: id,
    _status: status,
    _note: note ?? null,
  });
  if (error) throw error;
  if (!data) throw new Error("تعذر تأكيد تحديث حالة الشحنة.");
  return data as Shipment;
}

/** تحديث بيانات التتبع (GPS) للشحنة. */
export async function addTrackingPoint(
  shipmentId: string,
  lat: number,
  lng: number,
): Promise<ShipmentTracking> {
  const { data, error } = await supabase
    .from("shipment_tracking")
    .insert({ shipment_id: shipmentId, lat, lng })
    .select()
    .single();
  if (error) throw error;
  return data;
}

/** جلب نقاط تتبع الشحنة. */
export async function fetchTrackingPoints(shipmentId: string): Promise<ShipmentTracking[]> {
  const { data, error } = await supabase
    .from("shipment_tracking")
    .select("*")
    .eq("shipment_id", shipmentId)
    .order("recorded_at", { ascending: true });
  if (error) throw error;
  return data;
}

// ---------- ربط الشحنة بالطلب ----------

/** ربط طلب بشحنة (تُستدعى من المتجر بعد اختيار الشركة). */
export async function linkOrderToShipment(
  orderId: string,
  shipmentId: string,
  deliveryMethod: string = "delivery",
): Promise<void> {
  const { error } = await supabase.rpc("link_order_shipment", {
    _order_id: orderId,
    _shipment_id: shipmentId,
    _delivery_method: deliveryMethod,
  });
  if (error) throw error;
}

/** جلب الطلب مع جميع الشحنات التابعة له، بما فيها شحنات المتاجر المتعددة. */
export async function fetchOrderWithShipment(orderId: string) {
  const [{ data: order, error: orderError }, { data: shipments, error: shipmentsError }] =
    await Promise.all([
      supabase.from("orders").select("*").eq("id", orderId).single(),
      supabase.from("shipments").select("*").eq("order_id", orderId).order("created_at"),
    ]);
  if (orderError) throw orderError;
  if (shipmentsError) throw shipmentsError;
  return { ...order, shipments };
}

/** جلب شحنات متجر معين (تُستدعى من لوحة المتجر). */
export async function fetchShipmentsByStore(storeId: string): Promise<Shipment[]> {
  const { data, error } = await supabase
    .from("shipments")
    .select(
      "*, merchant_order:merchant_orders!inner(store_id, status), order:orders!inner(id, status, total, created_at, full_name, phone)",
    )
    .eq("merchant_order.store_id", storeId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}
