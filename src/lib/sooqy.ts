import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type DynamicTableClient = {
  from: (table: string) => {
    select: (columns: string) => {
      order: (
        column: string,
        options?: { ascending?: boolean },
      ) => Promise<{ data: unknown; error: Error | null }>;
    };
    insert: (values: Record<string, unknown>) => Promise<{ error: Error | null }>;
    update: (values: Record<string, unknown>) => {
      eq: (column: string, value: string) => Promise<{ error: Error | null }>;
    };
  };
};
import { distanceKm, isOpenNow, type LatLng } from "./geo";
import { categoryIds, resolveCategoryId } from "./taxonomy";

export type Store = Database["public"]["Tables"]["stores"]["Row"];
export type Product = Database["public"]["Tables"]["products"]["Row"];
export type Offer = Database["public"]["Tables"]["store_offers"]["Row"];
export type ProductImage = Database["public"]["Tables"]["product_images"]["Row"];
export type Wilaya = Database["public"]["Tables"]["wilayas"]["Row"];
export type Reservation = Database["public"]["Tables"]["reservations"]["Row"];
export type Review = {
  id: string;
  user_id: string;
  target_type: "product" | "store";
  target_id: string;
  rating: number;
  comment: string | null;
  status: "pending" | "approved" | "rejected";
  created_at: string;
};

export type OfferFull = Offer & { product: Product; store: Store; images: ProductImage[] };
export type ProductGroup = {
  product: Product;
  offers: OfferFull[];
  /**
   * العرض الأفضل: المتاح (مخزون > 0) والأرخص، وإلا الأرخص إجمالًا.
   * هذا هو **مصدر الحقيقة الوحيد** للسعر — تقرأ منه البطاقة وصفحة المنتج
   * وقاعدة البيانات، فلا يظهر سعر لا يمكن شراؤه.
   */
  bestOffer: OfferFull | null;
  /** سعر `bestOffer` — مشتق، لا يُحسب بشكل مستقل. */
  minPrice: number;
  image: string | null;
  available: boolean;
  totalStock: number;
  nearestKm: number | null;
};

// التصنيفات مصدرها `src/lib/taxonomy.ts` — لا تُكرَّر هنا.
export { categoryLabel, categoryEmoji } from "./taxonomy";

const OFFER_SELECT =
  "*, product:products!inner(*), store:stores!inner(*), images:product_images(*)";

export type StoreOfferSort = "newest" | "price-asc" | "price-desc";

/** Client-side catalog controls for the already-loaded offers of one store. */
export function filterAndSortStoreOffers(
  offers: OfferFull[],
  query: string,
  sort: StoreOfferSort,
): OfferFull[] {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const filtered = normalizedQuery
    ? offers.filter((offer) => offer.product.name.toLocaleLowerCase().includes(normalizedQuery))
    : [...offers];

  return filtered.sort((a, b) => {
    if (sort === "price-asc") return a.price - b.price;
    if (sort === "price-desc") return b.price - a.price;
    return Date.parse(b.created_at) - Date.parse(a.created_at);
  });
}

export function primaryImage(images: ProductImage[] | undefined) {
  if (!images?.length) return null;
  return (images.find((i) => i.is_primary) ?? images[0])!.image_url;
}

export type StockLevel = "in" | "low" | "out";

/** Buyer-facing saleability: hidden and out-of-stock offers cannot be purchased. */
export function stockLevel(o: Pick<Offer, "is_available" | "stock_quantity">): StockLevel {
  if (!o.is_available || o.stock_quantity <= 0) return "out";
  if (o.stock_quantity <= 3) return "low";
  return "in";
}

/** Merchant-facing physical inventory: visibility is a separate business decision. */
export function inventoryLevel(o: Pick<Offer, "stock_quantity">): StockLevel {
  if (o.stock_quantity <= 0) return "out";
  if (o.stock_quantity <= 3) return "low";
  return "in";
}

export function storeDistance(s: Store, pos: LatLng | null) {
  if (!pos || s.latitude == null || s.longitude == null) return null;
  return distanceKm(pos, { lat: s.latitude, lng: s.longitude });
}

/**
 * يختار العرض الأفضل لمجموعة منتج:
 * الأولوية للعرض **المتاح** (مخزون > 0) ثم الأرخص؛ وإن لم يوجد متاح، الأرخص إجمالًا.
 * القاعدة نفسها معرّفة في `products.$productId.tsx` — يجب أن تتفق الاثنتان.
 */
export function pickBestOffer(offers: OfferFull[]): OfferFull | null {
  if (!offers.length) return null;
  const available = offers.filter((o) => stockLevel(o) !== "out");
  const pool = available.length ? available : offers;
  return pool.reduce((a, b) => (b.price < a.price ? b : a));
}

function groupOffers(rows: OfferFull[], pos: LatLng | null): ProductGroup[] {
  const map = new Map<string, ProductGroup>();
  for (const o of rows) {
    let g = map.get(o.product_id);
    if (!g) {
      g = {
        product: o.product,
        offers: [],
        bestOffer: null,
        minPrice: 0,
        image: null,
        available: false,
        totalStock: 0,
        nearestKm: null,
      };
      map.set(o.product_id, g);
    }
    g.offers.push(o);
    const avail = stockLevel(o) !== "out";
    if (avail) {
      g.available = true;
      g.totalStock += o.stock_quantity;
    }
    g.image ??= primaryImage(o.images);
    const d = storeDistance(o.store, pos);
    if (d != null && (g.nearestKm == null || d < g.nearestKm)) g.nearestKm = d;
  }
  // مصدر الحقيقة: السعر يأتي من أفضل عرض متاح، لا من أرخص عرض نافد.
  return [...map.values()].map((g) => {
    const bestOffer = pickBestOffer(g.offers);
    return { ...g, bestOffer, minPrice: bestOffer ? bestOffer.price : 0 };
  });
}

// ---------- Reads ----------

export async function fetchWilayas(): Promise<Wilaya[]> {
  const { data, error } = await supabase.from("wilayas").select("*").order("id");
  if (error) throw error;
  return data;
}

/** Fetch unique communes for a wilaya (from stores table). */
export async function fetchCommunes(wilayaId: number | null): Promise<string[]> {
  if (!wilayaId) return [];
  const { data, error } = await supabase
    .from("stores")
    .select("commune")
    .eq("wilaya_id", wilayaId)
    .not("commune", "is", null);
  if (error) throw error;
  const unique = [...new Set(data.map((s) => s.commune).filter(Boolean))].sort();
  return unique;
}

/** Fetch recent store offers (for homepage promotions). */
export async function fetchHomepageOffers(
  opts: { wilayaId: number | null; limit?: number; offset?: number } = { wilayaId: null },
): Promise<OfferFull[]> {
  const { wilayaId, limit = 8, offset = 0 } = opts;
  let q = supabase.from("store_offers").select(OFFER_SELECT);
  if (wilayaId) q = q.eq("store.wilaya_id", wilayaId);
  const { data, error } = await q
    .eq("is_available", true)
    .gt("stock_quantity", 0)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) throw error;
  return data as unknown as OfferFull[];
}

/** Fetch suggested stores (high rating, verified, etc.) for homepage. */
export async function fetchSuggestedStores(
  opts: {
    wilayaId: number | null;
    lat?: number | null;
    lng?: number | null;
    limit?: number;
    offset?: number;
  } = { wilayaId: null },
): Promise<Store[]> {
  const { wilayaId, lat, lng, limit = 6, offset = 0 } = opts;
  let q = supabase.from("stores").select("*");
  if (wilayaId) q = q.eq("wilaya_id", wilayaId);
  const { data, error } = await q
    .eq("is_verified", true)
    .order("rating", { ascending: false })
    .range(offset, offset + limit * 2 - 1);
  if (error) throw error;
  const pos = lat != null && lng != null ? { lat, lng } : null;
  return data
    .map((s) => ({ ...s, distance: storeDistance(s, pos), open: isOpenNow(s.opening_hours) }))
    .sort((a, b) => (a.distance ?? 1e9) - (b.distance ?? 1e9))
    .slice(0, limit);
}

/** Increment product view count (fire-and-forget). */
export async function incrementProductView(productId: string): Promise<void> {
  // RPC موجود في الهجرات (202610120001) — لا مسار احتياطي بـ supabase.raw (غير موجودة في supabase-js v2)
  const call = supabase.rpc.bind(supabase) as unknown as (
    fn: string,
    vars?: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: unknown }>;
  const { error: rpcError } = await call("increment_product_view", { product_id: productId });
  if (rpcError) throw rpcError;
}

/** Fetch most viewed products for homepage. */
export async function fetchMostViewedProducts(
  opts: { limit?: number; offset?: number } = {},
): Promise<Product[]> {
  const { limit = 10, offset = 0 } = opts;
  // 1) المسار الأساسي: RPC (يتطلب هجرة 202610120001_product_views.sql —
  //    نفس الهجرة تُنشئ الدالة وعمود view_count معًا، فلا حاجة لمسار وسيط)
  const call = supabase.rpc.bind(supabase) as unknown as (
    fn: string,
    vars?: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: unknown }>;
  const { data: rpcData, error: rpcError } = await call("get_most_viewed_products", {
    limit_count: limit,
    offset_count: offset,
  });
  if (!rpcError && rpcData) {
    return rpcData as unknown as Product[];
  }
  // 2) الهجرة غير مطبّقة على هذه القاعدة (404) — نعرض أحدث المنتجات
  //    بدلًا من كسر قسم الصفحة الرئيسية؛ يعود الترتيب الصحيح تلقائيًا عند التطبيق.
  const { data: newest, error: nErr } = await supabase
    .from("products")
    .select("*")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);
  if (nErr) throw nErr;
  return newest as unknown as Product[];
}

/** Most-viewed products as real ProductGroups (with their live offers) for the homepage. */
export async function fetchMostViewedGroups(
  opts: { limit?: number; offset?: number } = {},
): Promise<ProductGroup[]> {
  const products = await fetchMostViewedProducts(opts);
  const ids = products.map((p) => p.id);
  if (!ids.length) return [];
  const { data, error } = await supabase
    .from("store_offers")
    .select(OFFER_SELECT)
    .in("product_id", ids);
  if (error) throw error;
  const groups = groupOffers(data as unknown as OfferFull[], null);
  const byId = new Map(groups.map((g) => [g.product.id, g]));
  // حافظ على ترتيب "الأكثر مشاهدة" من RPC
  const ordered: ProductGroup[] = [];
  for (const id of ids) {
    const g = byId.get(id);
    if (g) ordered.push(g);
  }
  return ordered;
}

export async function fetchNearStores(
  wilayaId: number | null,
  lat?: number | null,
  lng?: number | null,
) {
  let q = supabase.from("stores").select("*");
  if (wilayaId) q = q.eq("wilaya_id", wilayaId);
  const { data, error } = await q.limit(200);
  if (error) throw error;
  const pos = lat != null && lng != null ? { lat, lng } : null;
  return data
    .map((s) => ({ ...s, distance: storeDistance(s, pos), open: isOpenNow(s.opening_hours) }))
    .sort(
      (a, b) => (a.distance ?? 1e9) - (b.distance ?? 1e9) || Number(b.rating) - Number(a.rating),
    );
}

export type SortBy = "cheapest" | "nearest" | "rating" | "newest";

export async function searchProducts(opts: {
  query?: string;
  category?: string | string[] | null;
  wilaya?: number | null;
  inStockOnly?: boolean;
  sortBy?: SortBy;
  pos?: LatLng | null;
  limit?: number;
  offset?: number;
  minPrice?: number;
  maxPrice?: number;
  radius?: number | null; // km
  commune?: string | null;
}): Promise<ProductGroup[]> {
  let q = supabase.from("store_offers").select(OFFER_SELECT);
  const term = opts.query?.trim().replace(/[%,()]/g, " ");
  if (term) q = q.or(`name.ilike.%${term}%,brand.ilike.%${term}%`, { referencedTable: "products" });
  if (opts.category) {
    const cats = Array.isArray(opts.category) ? opts.category : [opts.category];
    const ids = cats.flatMap((c) => categoryIds(c));
    if (ids.length > 0) q = q.in("product.category", ids);
  }
  if (opts.wilaya) q = q.eq("store.wilaya_id", opts.wilaya);
  if (opts.commune) q = q.ilike("store.commune", opts.commune);
  if (opts.inStockOnly) q = q.eq("is_available", true).gt("stock_quantity", 0);
  if (opts.minPrice != null) q = q.gte("price", opts.minPrice);
  if (opts.maxPrice != null) q = q.lte("price", opts.maxPrice);
  const { data, error } = await q
    .order("created_at", { ascending: false })
    .range(opts.offset ?? 0, (opts.offset ?? 0) + (opts.limit ?? 300) - 1);
  if (error) throw error;
  let groups = groupOffers(data as unknown as OfferFull[], opts.pos ?? null);
  // Filter by radius if provided and user position exists
  if (opts.radius != null && opts.pos != null) {
    groups = groups.filter((g) => g.nearestKm != null && g.nearestKm <= opts.radius!);
  }
  const sort = opts.sortBy ?? "newest";
  if (sort === "cheapest") groups.sort((a, b) => a.minPrice - b.minPrice);
  if (sort === "nearest") groups.sort((a, b) => (a.nearestKm ?? 1e9) - (b.nearestKm ?? 1e9));
  if (sort === "rating")
    groups.sort(
      (a, b) =>
        Math.max(...b.offers.map((o) => Number(o.store.rating))) -
        Math.max(...a.offers.map((o) => Number(o.store.rating))),
    );
  return groups;
}

export async function searchStores(
  opts: {
    query?: string;
    wilaya?: number | null;
    commune?: string | null;
    openOnly?: boolean;
    verifiedOnly?: boolean;
    minRating?: number;
    sortBy?: "nearest" | "rating" | "name" | "newest";
    lat?: number | null;
    lng?: number | null;
    limit?: number;
    offset?: number;
  } = {},
): Promise<Store[]> {
  let q = supabase.from("stores").select("*");
  const term = opts.query?.trim().replace(/[%,()]/g, " ");
  if (term) q = q.or(`name.ilike.%${term}%,commune.ilike.%${term}%,description.ilike.%${term}%`);
  if (opts.wilaya) q = q.eq("wilaya_id", opts.wilaya);
  if (opts.commune) q = q.ilike("commune", opts.commune);
  if (opts.verifiedOnly) q = q.eq("is_verified", true);
  if (opts.minRating != null) q = q.gte("rating", opts.minRating);
  const { data, error } = await q
    .order("created_at", { ascending: false })
    .range(opts.offset ?? 0, (opts.offset ?? 0) + (opts.limit ?? 50) - 1);
  if (error) throw error;
  let stores = data as Store[];
  const pos = opts.lat != null && opts.lng != null ? { lat: opts.lat, lng: opts.lng } : null;
  stores = stores.map((s) => ({
    ...s,
    distance: storeDistance(s, pos),
    open: isOpenNow(s.opening_hours),
  }));
  // فلتر "مفتوح الآن" يُحسب عميلًا — لا يوجد عمود is_open_now في الجدول
  if (opts.openOnly) stores = stores.filter((s) => s.open);
  const sort = opts.sortBy ?? "nearest";
  if (sort === "nearest") stores.sort((a, b) => (a.distance ?? 1e9) - (b.distance ?? 1e9));
  if (sort === "rating") stores.sort((a, b) => Number(b.rating) - Number(a.rating));
  if (sort === "name") stores.sort((a, b) => a.name.localeCompare(b.name, "ar"));
  if (sort === "newest")
    stores.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  return stores;
}

export async function getProduct(productId: string) {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("id", productId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getProductComparisonOffers(productId: string): Promise<OfferFull[]> {
  const { data, error } = await supabase
    .from("store_offers")
    .select(OFFER_SELECT)
    .eq("product_id", productId)
    .order("price");
  if (error) throw error;
  return data as unknown as OfferFull[];
}

export async function getStore(storeId: string) {
  const { data, error } = await supabase.from("stores").select("*").eq("id", storeId).maybeSingle();
  if (error) throw error;
  return data;
}

export async function getStoreOffers(storeId: string): Promise<OfferFull[]> {
  const { data, error } = await supabase
    .from("store_offers")
    .select(OFFER_SELECT)
    .eq("store_id", storeId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as unknown as OfferFull[];
}

export async function fetchReviews(
  targetType: "product" | "store",
  targetId: string,
): Promise<Review[]> {
  const { data, error } = await supabase
    .from("reviews")
    .select("*")
    .eq("target_type", targetType)
    .eq("target_id", targetId)
    .eq("status", "approved")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as unknown as Review[];
}

export async function fetchMyReview(targetType: "product" | "store", targetId: string) {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return null;
  const { data, error } = await supabase
    .from("reviews")
    .select("*")
    .eq("target_type", targetType)
    .eq("target_id", targetId)
    .eq("user_id", u.user.id)
    .maybeSingle();
  if (error) throw error;
  return data as unknown as Review | null;
}

export async function submitReview(
  targetType: "product" | "store",
  targetId: string,
  rating: number,
  comment?: string,
) {
  // المراجعات الموثّقة: عبر دالة RPC تتحقق من طلب مُسلَّم أو حجز مُستلَم
  // (هجرة 202610140001). إن كانت القاعدة غير مهاجَرة (الدالة غير موجودة)
  // نرجع للإدراج المباشر القديم حتى لا تنكسر الميزة.
  const rpcArgs: {
    _comment?: string;
    _rating: number;
    _target_id: string;
    _target_type: "product" | "store";
  } = {
    _target_type: targetType,
    _target_id: targetId,
    _rating: rating,
  };
  if (comment?.trim()) rpcArgs._comment = comment.trim();
  const { data: rpcData, error: rpcError } = await supabase.rpc("submit_review", rpcArgs);
  if (rpcError?.message?.includes("Could not find the function")) {
    const { data: direct, error: dErr } = await supabase
      .from("reviews")
      .insert({
        target_type: targetType,
        target_id: targetId,
        rating,
        comment: comment?.trim() || null,
      })
      .select()
      .single();
    if (dErr) throw new Error(friendlyError(dErr));
    return direct as unknown as Review;
  }
  if (rpcError) throw new Error(friendlyError(rpcError));
  return rpcData as unknown as Review;
}

export async function getOffersByIds(ids: string[]): Promise<OfferFull[]> {
  if (!ids.length) return [];
  const { data, error } = await supabase.from("store_offers").select(OFFER_SELECT).in("id", ids);
  if (error) throw error;
  return data as unknown as OfferFull[];
}

// ---------- Customer actions ----------

const ERRORS: Record<string, string> = {
  not_authenticated: "يجب تسجيل الدخول أولاً",
  delivery_company_required: "اختر شركة توصيل قبل تأكيد الطلب",
  invalid_payment_method: "طريقة الدفع غير مدعومة. الدفع عند الاستلام فقط.",
  delivery_company_unavailable: "شركة التوصيل المختارة غير متاحة أو لم تعد معتمدة",
  delivery_area_not_covered: "شركة التوصيل المختارة لا تغطي البلدية المحددة",
  out_of_stock: "المنتج غير متوفر أو الكمية غير كافية",
  offer_not_found: "العرض غير موجود",
  invalid_quantity: "كمية غير صالحة",
  receipt_required: "يرجى رفع صورة وصل الدفع عبر بريدي موب",
  empty_bag: "السلة فارغة",
  invalid_wilaya: "اختر ولاية صحيحة",
  reservation_not_found: "كود الحجز غير موجود في متجرك",
  reservation_expired: "انتهت صلاحية الحجز",
  reservation_collected: "تم استلام هذا الحجز سابقاً",
  reservation_cancelled: "هذا الحجز ملغى",
  not_cancellable: "لا يمكن إلغاء هذا الحجز",
  forbidden: "غير مسموح",
  review_not_verified: "لا يمكنك التقييم إلا بعد استلام طلب أو حجز مؤكد",
  invalid_rating: "التقييم يجب أن يكون بين 1 و 5 نجوم",
};
export function friendlyError(e: unknown) {
  const msg = (e as { message?: string })?.message ?? String(e);
  const key = Object.keys(ERRORS).find((k) => msg.includes(k));
  return key ? ERRORS[key]! : msg;
}

export async function cancelReservation(id: string) {
  const { error } = await supabase.rpc("cancel_reservation", { _reservation_id: id });
  if (error) throw new Error(friendlyError(error));
}

type UserArchiveClient = {
  from: (table: string) => {
    select: (columns: string) => {
      eq: (
        column: string,
        value: string,
      ) => Promise<{
        data: { activity_type: string; activity_id: string }[] | null;
        error: Error | null;
      }>;
    };
  };
  rpc: (fn: string, args: Record<string, unknown>) => Promise<{ error: Error | null }>;
};

const archiveClient = supabase as unknown as UserArchiveClient;

export async function archiveMyActivity(
  activityType: "order" | "reservation",
  activityId: string,
): Promise<void> {
  const { error } = await archiveClient.rpc("archive_my_activity", {
    _activity_type: activityType,
    _activity_id: activityId,
  });
  if (error) throw new Error(friendlyError(error));
}

async function fetchArchivedActivityIds(
  userId: string,
  activityType: "order" | "reservation",
): Promise<Set<string>> {
  const { data, error } = await archiveClient
    .from("user_activity_archive")
    .select("activity_type, activity_id")
    .eq("user_id", userId);
  if (error) throw error;
  return new Set(
    (data ?? []).filter((row) => row.activity_type === activityType).map((row) => row.activity_id),
  );
}

/** إلغاء حجز المستخدم عبر RPC ذري يتحقق من الملكية ويعيد المخزون. */
export async function cancelMyReservation(reservationId: string): Promise<void> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("يجب تسجيل الدخول لإلغاء الحجز.");

  const call = supabase.rpc.bind(supabase) as unknown as (
    fn: string,
    vars?: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: { message?: string; code?: string } | null }>;
  const { error } = await call("cancel_reservation", {
    _reservation_id: reservationId,
  });
  if (!error) return;

  const message = error.message ?? "";
  if (message.includes("reservation_not_found")) {
    throw new Error("لم نعثر على هذا الحجز في حسابك.");
  }
  if (message.includes("reservation_not_cancellable") || message.includes("not_cancellable")) {
    throw new Error("لا يمكن إلغاء هذا الحجز؛ ربما تم استلامه أو إلغاؤه مسبقًا.");
  }
  if (message.includes("reservation_stock_restore_failed")) {
    throw new Error("تعذر تحديث مخزون المتجر. لم يتم إلغاء الحجز.");
  }
  if (message.includes("PGRST202") || message.includes("Could not find the function")) {
    throw new Error("تعذر الوصول إلى خدمة الإلغاء. حدّث الصفحة ثم حاول مجددًا.");
  }
  throw new Error(friendlyError(error));
}

/** إلغاء طلب قيد الانتظار وإعادة كمياته إلى مخزون المتاجر في معاملة واحدة. */
export async function cancelMyOrder(orderId: string): Promise<void> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("يجب تسجيل الدخول لإلغاء الطلب.");

  // Supabase client methods rely on their client instance as `this`.
  // Calling rpc after extracting it loses that context and can throw
  // "Cannot read properties of undefined (reading 'rest')".
  const call = supabase.rpc.bind(supabase) as unknown as (
    fn: string,
    vars?: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: { message?: string; code?: string } | null }>;
  const { error } = await call("cancel_my_order", { _order_id: orderId });
  if (!error) return;

  const message = error.message ?? "";
  if (message.includes("order_not_found")) {
    throw new Error("لم نعثر على هذا الطلب في حسابك.");
  }
  if (message.includes("order_not_cancellable")) {
    throw new Error("لا يمكن إلغاء الطلب بعد بدء معالجته.");
  }
  if (message.includes("order_already_processing")) {
    throw new Error("بدأت شركة التوصيل معالجة هذا الطلب، لذلك لا يمكن إلغاؤه من هنا.");
  }
  if (message.includes("order_shipment_not_found")) {
    throw new Error("تعذر التحقق من شحنة الطلب. لم يتم إلغاء الطلب.");
  }
  if (message.includes("PGRST202") || message.includes("Could not find the function")) {
    throw new Error("تعذر الوصول إلى خدمة الإلغاء. حدّث الصفحة ثم حاول مجددًا.");
  }
  throw new Error(friendlyError(error));
}

/** إلغاء طلب متجر فرعي قيد الانتظار وإعادة مخزونه ذريًا. */
export async function cancelMyMerchantOrder(merchantOrderId: string): Promise<void> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("يجب تسجيل الدخول لإلغاء الطلب.");

  const call = supabase.rpc.bind(supabase) as unknown as (
    fn: string,
    vars?: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: { message?: string; code?: string } | null }>;
  const { error } = await call("cancel_my_merchant_order", {
    _merchant_order_id: merchantOrderId,
  });
  if (!error) return;

  const message = error.message ?? "";
  if (message.includes("merchant_order_not_found")) {
    throw new Error("لم نعثر على طلب هذا المتجر في حسابك.");
  }
  if (message.includes("merchant_order_not_cancellable")) {
    throw new Error("لا يمكن إلغاء طلب المتجر بعد إرسال عرض السعر أو بدء معالجته.");
  }
  if (message.includes("PGRST202") || message.includes("Could not find the function")) {
    throw new Error("خدمة إلغاء طلب المتجر غير متاحة بعد. حدّث الصفحة وحاول مجددًا.");
  }
  throw new Error(friendlyError(error));
}

export async function fetchMyReservations() {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return [];
  const archivedIds = await fetchArchivedActivityIds(u.user.id, "reservation");
  const { data, error } = await supabase
    .from("reservations")
    .select(
      "*, store:stores(name, phone, latitude, longitude, address_line), offer:store_offers(price, product:products(name))",
    )
    .eq("user_id", u.user.id)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return data.filter((reservation) => !archivedIds.has(reservation.id));
}

export async function fetchMyOrders() {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return [];
  const archivedIds = await fetchArchivedActivityIds(u.user.id, "order");
  const { data, error } = await supabase
    .from("orders")
    .select(
      "*, items:order_items(*), merchant_orders(id, order_id, store_id, status, subtotal, shipping_fee, quoted_at, payment_status, paid_amount, paid_at, store:stores(name, address_line, commune), items:order_items(*)), wilaya:wilayas(name_ar)",
    )
    .eq("user_id", u.user.id)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data.filter((order) => !archivedIds.has(order.id));
}

export async function fetchMyNotifications() {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return [];
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", u.user.id)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return data;
}

export async function fetchUnreadNotificationCount(): Promise<number> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return 0;
  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", u.user.id)
    .eq("read", false);
  if (error) throw error;
  return count ?? 0;
}

export async function markNotificationsRead() {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return;
  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("user_id", u.user.id)
    .eq("read", false);
  if (error) throw error;
}

export async function markNotificationRead(notificationId: string) {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return;
  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("id", notificationId)
    .eq("user_id", u.user.id);
  if (error) throw error;
}

export async function deleteNotification(notificationId: string) {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return;
  const { error } = await supabase
    .from("notifications")
    .delete()
    .eq("id", notificationId)
    .eq("user_id", u.user.id);
  if (error) throw error;
}

/** Upload user-owned media. Catalog media uses public URLs; payment receipts remain private paths. */
export async function uploadImageToBucket(
  file: File,
  bucketName: "store-media" | "product-media" | "receipts",
) {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error(ERRORS["not_authenticated"]);
  if (file.size > 10 * 1024 * 1024) throw new Error("الصورة أكبر من 10MB");
  const mimeToExtension: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/avif": "avif",
    "image/gif": "gif",
    "image/heic": "heic",
    "image/heif": "heif",
  };
  const mimeType = file.type.toLowerCase();
  const ext = mimeToExtension[mimeType];
  if (!ext) throw new Error("نوع الصورة غير مدعوم. استخدم JPG أو PNG أو WebP أو AVIF.");
  const path = `${u.user.id}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from(bucketName)
    .upload(path, file, { contentType: mimeType, upsert: false });
  if (error) throw error;

  if (bucketName === "receipts") return path;
  return supabase.storage.from(bucketName).getPublicUrl(path).data.publicUrl;
}

/** Create a short-lived URL only when an authorized user opens a private receipt. */
export async function createReceiptSignedUrl(receiptRef: string): Promise<string> {
  let objectPath = receiptRef.trim();
  const signedPathMarker = "/storage/v1/object/sign/receipts/";

  // Migrate old long-lived signed links to a fresh, short-lived link.
  if (/^https?:\/\//i.test(objectPath)) {
    const markerIndex = objectPath.indexOf(signedPathMarker);
    if (markerIndex < 0) throw new Error("رابط إيصال الدفع غير صالح");
    objectPath = objectPath.slice(markerIndex + signedPathMarker.length).split("?")[0];
    try {
      objectPath = decodeURIComponent(objectPath);
    } catch {
      throw new Error("رابط إيصال الدفع غير صالح");
    }
  }

  if (!objectPath || objectPath.startsWith("/") || objectPath.includes("..")) {
    throw new Error("مسار إيصال الدفع غير صالح");
  }

  const { data, error } = await supabase.storage
    .from("receipts")
    .createSignedUrl(objectPath, 15 * 60);
  if (error) throw error;
  return data.signedUrl;
}

// ---------- Schema support (تخصيص إضافي) ----------
// أعمدة جديدة (روابط التواصل، صورة الملف الشخصي) تحتاج هجرة
// supabase/migrations/202610130001_store_socials_avatar.sql.
// نفحص وجودها مرة واحدة لكل جلسة ونتكيف تلقائيًا مع القواعد غير المهاجَرة.

let schemaSupport: Promise<{
  storeSocials: boolean;
  avatar: boolean;
  storeCategories: boolean;
}> | null = null;

export function fetchSchemaSupport() {
  if (!schemaSupport) {
    schemaSupport = (async () => {
      const [insta, fb, av, cat] = await Promise.all([
        supabase.from("stores").select("instagram_url").limit(1),
        supabase.from("stores").select("facebook_url").limit(1),
        supabase.from("profiles").select("avatar_url").limit(1),
        supabase.from("stores").select("category,subcategories").limit(1),
      ]);
      return {
        storeSocials: !insta.error && !fb.error,
        avatar: !av.error,
        storeCategories: !cat.error,
      };
    })().catch(() => ({ storeSocials: false, avatar: false, storeCategories: false }));
  }
  return schemaSupport;
}

export type CategoryStat = { id: string; products: number; stores: number };

/**
 * إحصاءات التصنيفات (عدد المنتجات/المتاجر لكل تصنيف) من دالة `category_stats` في القاعدة.
 * تعيد `null` إن لم تكن الدالة موجودة (الهجرة غير مطبّقة) → تُعرض كل التصنيفات بلا أعداد
 * بدل إخفائها، فلا تفرغ الصفحة الرئيسية على قاعدة جديدة.
 */
export async function fetchCategoryStats(): Promise<CategoryStat[] | null> {
  const call = supabase.rpc.bind(supabase) as unknown as (
    fn: string,
  ) => Promise<{ data: unknown; error: unknown }>;
  const { data, error } = await call("category_stats");
  if (error || !Array.isArray(data)) return null;
  return (data as { id?: unknown; products?: unknown; stores?: unknown }[]).map((row) => ({
    id: resolveCategoryId(String(row.id ?? "")),
    products: Number(row.products) || 0,
    stores: Number(row.stores) || 0,
  }));
}

export type BagItem = {
  offerId: string;
  quantity: number;
  options: Record<string, string>;
  /** لقطة السعر عند الإضافة — تُستخدم لكشف تغيّر السعر قبل الدفع. */
  price?: number;
  /** لقطة اسم المنتج — تبقى معروضة حتى لو حُذف العرض. */
  name?: string;
  /** معرّف المنتج — يُستخدم لفتح صفحة المنتج حتى عند اختفاء العرض. */
  productId?: string;
};

export async function createOrderWithDelivery(
  bagItems: BagItem[],
  deliveryType: "home" | "desk",
  wilayaId: number,
  commune: string,
  paymentMethod: "cod",
  contact: { fullName: string; phone: string; address: string },
  idempotencyKey: string,
) {
  if (paymentMethod !== "cod") throw new Error(ERRORS["invalid_payment_method"]);

  const orderArgs = {
    _items: bagItems.map((item) => ({
      offer_id: item.offerId,
      quantity: item.quantity,
      options: item.options,
    })),
    _delivery_type: deliveryType,
    _wilaya_id: wilayaId,
    _commune: commune,
    _address_line: contact.address,
    _full_name: contact.fullName,
    _phone: contact.phone,
    _payment_method: "cod",
    _idempotency_key: idempotencyKey,
  };

  // The checkout creates only the parent order and store suborders.
  // Each merchant sets its delivery fee after reviewing its own suborder.
  const { data, error } = await supabase.rpc("create_order_with_delivery", orderArgs);
  if (error) throw new Error(friendlyError(error));
  if (typeof data !== "string") throw new Error("تعذر تأكيد إنشاء الطلب.");
  return data;
}
// ---------- Merchant ----------

export async function fetchMyStore() {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return null;
  const { data, error } = await supabase
    .from("stores")
    .select("*")
    .eq("owner_id", u.user.id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function fetchMyRoles() {
  const { data, error } = await supabase.from("user_roles").select("role");
  if (error) throw error;
  return data.map((r) => r.role);
}

export async function merchantCreateStore(input: {
  name: string;
  phone: string;
  whatsapp: string;
  wilaya_id: number;
  commune: string;
  address_line: string;
  latitude: number | null;
  longitude: number | null;
  open: string;
  close: string;
  category?: string | null;
  subcategories?: string[] | null;
}) {
  const slug =
    input.name
      .toLowerCase()
      .replace(/[^a-z0-9\u0600-\u06FF]+/g, "-")
      .replace(/^-|-$/g, "") +
    "-" +
    Math.random().toString(36).slice(2, 6);

  const { data: storeId, error: createError } = await supabase.rpc("create_my_store", {
    _store_name: input.name,
    _slug: slug,
    _phone: input.phone,
    _whatsapp: input.whatsapp,
    _wilaya_id: input.wilaya_id,
    _commune: input.commune,
    _address_line: input.address_line,
    _latitude: input.latitude,
    _longitude: input.longitude,
    _opening_hours: { open: input.open, close: input.close, closed_days: [] },
    _category: input.category ? resolveCategoryId(input.category) : null,
    _subcategories: input.subcategories ?? [],
  });
  if (createError) throw new Error(friendlyError(createError));
  if (!storeId) throw new Error("store_creation_failed");

  const { data, error } = await supabase.from("stores").select("*").eq("id", storeId).single();
  if (error) throw new Error(friendlyError(error));
  return data;
}

export async function merchantToggleAvailability(offerId: string, isAvailable: boolean) {
  const patch = {
    is_merchant_hidden: !isAvailable,
    last_confirmed_at: new Date().toISOString(),
  };
  const { error } = await supabase
    .from("store_offers")
.update(patch)
    .eq("id", offerId);
  if (error) throw error;
}

export async function merchantUpdateOffer(
  offerId: string,
  patch: { price?: number; stock_quantity?: number },
) {
  const { error } = await supabase
    .from("store_offers")
    // Database trigger derives is_available from stock_quantity and the
    // merchant's independent visibility choice.
    .update({
      ...patch,
      last_confirmed_at: new Date().toISOString(),
    })
    .eq("id", offerId);
  if (error) throw error;
}

/**
 * حذف منتج من المتجر نهائيًا من قاعدة البيانات (ليس إخفاءً من الواجهة فقط).
 * - لا يُفسد سجل الطلبات: order_items يحتفظ بلقطة (product_name, unit_price).
 * - يمنع الحذف إذا كان على المنتج حجز نشط لم ينتهِ بعد.
 * - سياسات RLS تضمن أن التاجر لا يحذف إلا عروض متجره (نتحقق من الصفوف المحذوفة).
 */
export async function merchantDeleteOffer(offerId: string): Promise<void> {
  const { data: active, error: activeError } = await supabase
    .from("reservations")
    .select("id")
    .eq("offer_id", offerId)
    .eq("status", "pending")
    .gt("expires_at", new Date().toISOString())
    .limit(1);
  if (activeError) throw activeError;
  if (active && active.length > 0) {
    throw new Error("هذا المنتج عليه حجز نشط — انتظر انتهاءه أو ألغِه ثم أعد المحاولة.");
  }

  const { data: deleted, error } = await supabase
    .from("store_offers")
    .delete()
    .eq("id", offerId)
    .select("id");
  if (error) throw error;
  if (!deleted || deleted.length === 0) {
    throw new Error("لا تملك صلاحية حذف هذا المنتج.");
  }
}

export async function merchantConfirmAll(storeId: string) {
  const { data, error } = await supabase.rpc("merchant_confirm_all_stock", { _store_id: storeId });
  if (error) throw new Error(friendlyError(error));
  return data as number;
}

export async function merchantConfirmReservation(code: string) {
  const { data, error } = await supabase.rpc("merchant_confirm_reservation", { _code: code });
  if (error) throw new Error(friendlyError(error));

  const reservation = data as Reservation;
  // The RPC commits expiry + stock restoration before returning the expired row.
  // Preserve the existing UX error only after that transaction has committed.
  if (reservation?.status === "expired") {
    throw new Error(ERRORS["reservation_expired"]);
  }
  return reservation;
}

export async function merchantQuickAddProduct(
  productData: {
    storeId: string;
    name: string;
    price: number;
    stock: number;
    category: string;
    brand?: string;
    description?: string;
    sizes?: string[];
    colors?: string[];
  },
  imageFiles: File[] | null,
) {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error(ERRORS["not_authenticated"]);

  const imageUrls: string[] = [];
  if (imageFiles?.length) {
    for (const file of imageFiles) {
      const url = await uploadImageToBucket(file, "product-media");
      imageUrls.push(url);
    }
  }

  const { data: product, error: pErr } = await supabase
    .from("products")
    .insert({
      name: productData.name,
      category: productData.category,
      brand: productData.brand || null,
      description: productData.description || null,
      created_by: u.user.id,
    })
    .select()
    .single();
  if (pErr) throw pErr;
  const options: Record<string, string[]> = {};
  if (productData.sizes?.length) options["sizes"] = productData.sizes;
  if (productData.colors?.length) options["colors"] = productData.colors;
  const { data: offer, error: oErr } = await supabase
    .from("store_offers")
    .insert({
      store_id: productData.storeId,
      product_id: product.id,
      price: productData.price,
      stock_quantity: productData.stock,
      is_available: productData.stock > 0,
      options,
    })
    .select()
    .single();
  if (oErr) throw oErr;

  // إدراج جميع الصور، أول صورة تُصبح الأساسية
  if (imageUrls.length) {
    const rows = imageUrls.map((url, i) => ({
      offer_id: offer.id,
      image_url: url,
      is_primary: i === 0,
    }));
    const { error: iErr } = await supabase.from("product_images").insert(rows);
    if (iErr) throw iErr;
  }
  return offer;
}

/** رفع صور متعددة لعرض موجود وإدراجها في product_images. */
export async function merchantAddOfferImages(offerId: string, files: File[]) {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error(ERRORS["not_authenticated"]);

  // التحقق من ملكية العرض قبل الرفع
  const { data: existing, error: qErr } = await supabase
    .from("store_offers")
    .select("id")
    .eq("id", offerId)
    .maybeSingle();
  if (qErr) throw qErr;
  if (!existing) throw new Error("العرض غير موجود");

  const imageUrls: string[] = [];
  for (const file of files) {
    const url = await uploadImageToBucket(file, "product-media");
    imageUrls.push(url);
  }

  // التحقق من وجود صور أساسية بالفعل
  const { data: hasPrimary } = await supabase
    .from("product_images")
    .select("id")
    .eq("offer_id", offerId)
    .eq("is_primary", true)
    .maybeSingle();

  const rows = imageUrls.map((url) => ({
    offer_id: offerId,
    image_url: url,
    is_primary: !hasPrimary, // أول دفعة تُصبح أساسية إن لم تكن هناك أساسية
  }));
  const { error: iErr } = await supabase.from("product_images").insert(rows);
  if (iErr) throw iErr;
  return imageUrls;
}

/** حذف صورة منتج بمعرفها. */
export async function merchantRemoveOfferImage(imageId: string) {
  const { error } = await supabase.from("product_images").delete().eq("id", imageId);
  if (error) throw error;
}

/** تحديد صورة كأساسية للعرض. */
export async function merchantSetPrimaryImage(imageId: string) {
  const { data: img, error: qErr } = await supabase
    .from("product_images")
    .select("offer_id")
    .eq("id", imageId)
    .maybeSingle();
  if (qErr) throw qErr;
  if (!img) throw new Error("الصورة غير موجودة");

  // إزالة الأساسيية من كل صور العرض
  const { error: resetErr } = await supabase
    .from("product_images")
    .update({ is_primary: false })
    .eq("offer_id", img.offer_id);
  if (resetErr) throw resetErr;

  // تعيين الصورة المختارة كأساسية
  const { error } = await supabase
    .from("product_images")
    .update({ is_primary: true })
    .eq("id", imageId);
  if (error) throw error;
}

/** تعديل بيانات المنتج نفسه (الاسم/الوصف/العلامة/التصنيف) — يظهر في كل المتاجر التي تبيعه. */
export async function merchantUpdateProduct(
  productId: string,
  patch: { name?: string; description?: string | null; brand?: string | null; category?: string },
) {
  const { error } = await supabase.from("products").update(patch).eq("id", productId);
  if (error) throw error;
}

/** استبدال صورة المنتج (أو إضافتها إن لم توجد) لعرض معيّن. */
export async function merchantReplaceOfferImage(offerId: string, file: File) {
  const imageUrl = await uploadImageToBucket(file, "product-media");
  const { data: existing, error: qErr } = await supabase
    .from("product_images")
    .select("id")
    .eq("offer_id", offerId)
    .eq("is_primary", true)
    .maybeSingle();
  if (qErr) throw qErr;
  if (existing) {
    const { error } = await supabase
      .from("product_images")
      .update({ image_url: imageUrl })
      .eq("id", existing.id);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from("product_images")
      .insert({ offer_id: offerId, image_url: imageUrl, is_primary: true });
    if (error) throw error;
  }
  return imageUrl;
}

export async function fetchStoreReservations(storeId: string) {
  const { data, error } = await supabase
    .from("reservations")
    .select("*, offer:store_offers(price, product:products(name))")
    .eq("store_id", storeId)
    .is("merchant_archived_at", null)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return data;
}

export async function fetchStoreOrderItems(storeId: string) {
  const { data, error } = await supabase
    .from("order_items")
    .select(
      "*, merchant_order:merchant_orders!inner(id, status, subtotal, shipping_fee, quoted_at), order:orders(id, full_name, phone, commune, delivery_type, payment_method, receipt_url, status, total, created_at, wilaya:wilayas(name_ar))",
    )
    .eq("store_id", storeId)
    .eq("merchant_order.store_id", storeId)
    .is("merchant_archived_at", null)
    .order("id", { ascending: false })
    .limit(100);
  if (error) throw error;
  // لا نعرض الطلبات التي ألغى العميل طلبها؛ تبقى محفوظة في سجل العميل.
  return data.filter((item) => item.order?.status !== "cancelled");
}

export async function merchantArchiveReservation(reservationId: string): Promise<void> {
  const rpc = supabase.rpc.bind(supabase) as unknown as (
    fn: string,
    args: { _reservation_id: string },
  ) => Promise<{ error: unknown }>;
  const { error } = await rpc("merchant_archive_reservation", {
    _reservation_id: reservationId,
  });
  if (error) throw error;
}

export async function merchantArchiveOrderItems(orderId: string, storeId: string): Promise<void> {
  const { error } = await supabase.rpc("merchant_archive_order_items", {
    _order_id: orderId,
    _store_id: storeId,
  });
  if (error) throw new Error(friendlyError(error));
}

export async function merchantSubmitOrderQuote(
  orderId: string,
  shippingFee: number,
): Promise<void> {
  const store = await fetchMyStore();
  if (!store) throw new Error("المتجر غير موجود");

  const { data: merchantOrder, error: lookupError } = await supabase
    .from("merchant_orders")
    .select("id")
    .eq("order_id", orderId)
    .eq("store_id", store.id)
    .maybeSingle();
  if (lookupError) throw lookupError;
  if (!merchantOrder) throw new Error("طلب المتجر غير موجود");

  const rpc = supabase.rpc.bind(supabase) as unknown as (
    fn: string,
    args: { _merchant_order_id: string; _shipping_fee: number },
  ) => Promise<{ error: unknown }>;
  const { error } = await rpc("merchant_submit_order_quote", {
    _merchant_order_id: merchantOrder.id,
    _shipping_fee: Math.round(shippingFee),
  });
  if (error) throw new Error(friendlyError(error));
}

export async function customerRespondToMerchantOrder(
  merchantOrderId: string,
  accept: boolean,
): Promise<void> {
  const rpc = supabase.rpc.bind(supabase) as unknown as (
    fn: string,
    args: { _merchant_order_id: string; _accept: boolean },
  ) => Promise<{ error: unknown }>;
  const { error } = await rpc("customer_respond_to_merchant_order", {
    _merchant_order_id: merchantOrderId,
    _accept: accept,
  });
  if (error) throw new Error(friendlyError(error));
}

export async function collectMerchantOrderCod(merchantOrderId: string): Promise<void> {
  const rpc = supabase.rpc.bind(supabase) as unknown as (
    fn: string,
    args: { _merchant_order_id: string },
  ) => Promise<{ error: unknown }>;
  const { error } = await rpc("collect_merchant_order_cod", {
    _merchant_order_id: merchantOrderId,
  });
  if (error) throw new Error(friendlyError(error));
}

export async function merchantRejectOrder(merchantOrderId: string, reason?: string): Promise<void> {
  const rpc = supabase.rpc.bind(supabase) as unknown as (
    fn: string,
    args: { _merchant_order_id: string; _reason: string | null },
  ) => Promise<{ error: unknown }>;
  const { error } = await rpc("merchant_reject_order", {
    _merchant_order_id: merchantOrderId,
    _reason: reason?.trim() || null,
  });
  if (error) throw new Error(friendlyError(error));
}

export async function merchantUpdateOrderStatus(orderId: string, status: "delivered") {
  const store = await fetchMyStore();
  if (!store) throw new Error("المتجر غير موجود");

  const { data: merchantOrder, error: lookupError } = await supabase
    .from("merchant_orders")
    .select("id")
    .eq("order_id", orderId)
    .eq("store_id", store.id)
    .maybeSingle();
  if (lookupError) throw lookupError;
  if (!merchantOrder) throw new Error("طلب المتجر غير موجود");

  const { error } = await supabase.rpc("merchant_update_merchant_order_status", {
    _merchant_order_id: merchantOrder.id,
    _status: status,
  });
  if (error) throw new Error(friendlyError(error));
}

export async function merchantUpdateOrderNote(orderId: string, note: string) {
  const rpc = supabase.rpc.bind(supabase) as unknown as (
    fn: string,
    args: { _order_id: string; _note: string },
  ) => Promise<{ error: unknown }>;
  const { error } = await rpc("merchant_update_order_note", {
    _order_id: orderId,
    _note: note,
  });
  if (error) throw error;
}

// ---------- Detail pages ----------

export const DZ_PHONE = /^0[567]\d{8}$/;
export function normalizePhone(v: string) {
  return v.replace(/[\s.-]/g, "").replace(/^\+213/, "0");
}
export function isValidDzPhone(v: string) {
  return DZ_PHONE.test(normalizePhone(v));
}

export async function fetchOrder(orderId: string) {
  const { data, error } = await supabase
    .from("orders")
    .select(
      "*, items:order_items(*, store:stores(id, name, phone, whatsapp)), merchant_orders(id, store_id, status, subtotal, shipping_fee, quoted_at, payment_status, paid_amount, paid_at), wilaya:wilayas(name_ar)",
    )
    .eq("id", orderId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function fetchReservation(id: string) {
  const { data, error } = await supabase
    .from("reservations")
    .select(
      "*, store:stores(id, name, phone, whatsapp, latitude, longitude, address_line, commune), offer:store_offers(price, product:products(id, name))",
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];

export async function fetchMyProfile() {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return null;
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", u.user.id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export type PublicProfile = {
  full_name: string | null;
  avatar_url: string | null;
  wilaya_id: number | null;
  commune: string | null;
};

export async function fetchPublicProfile(userId: string): Promise<PublicProfile | null> {
  const { data, error } = await supabase
    .from("public_personal_profiles")
    .select("full_name, avatar_url, wilaya_id, commune")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(friendlyError(error));
  return data;
}

export async function setMyProfileVisibility(isPublic: boolean) {
  const { error } = await supabase.rpc("set_my_profile_visibility", {
    _is_public: isPublic,
  });
  if (error) throw new Error(friendlyError(error));
}

export async function fetchMyAccountType() {
  const { data, error } = await supabase.rpc("get_my_account_type");
  if (error) throw new Error(friendlyError(error));
  if (!data) throw new Error("profile_not_found");
  return data;
}

export async function updateMyProfile(patch: {
  full_name: string;
  phone: string;
  wilaya_id: number | null;
  commune: string;
  avatar_url?: string | null;
}) {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error(ERRORS["not_authenticated"]);
  const data: Record<string, unknown> = {
    full_name: patch.full_name,
    phone: patch.phone,
    wilaya_id: patch.wilaya_id,
    commune: patch.commune,
  };
  // صورة الملف: تُحفظ فقط إذا كان العمود موجودًا في القاعدة (هجرة 202610130001)
  if (patch.avatar_url !== undefined) {
    const support = await fetchSchemaSupport();
    if (support.avatar) data["avatar_url"] = patch.avatar_url;
  }
  const existing = await fetchMyProfile();
  if (existing) {
    const { error } = await supabase
      .from("profiles")
      .update(data as Database["public"]["Tables"]["profiles"]["Update"])
      .eq("user_id", u.user.id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("profiles").insert({
      ...data,
      user_id: u.user.id,
    } as Database["public"]["Tables"]["profiles"]["Insert"]);
    if (error) throw error;
  }
}

export async function merchantUpdateStore(
  storeId: string,
  patch: {
    name: string;
    description: string | null;
    phone: string;
    whatsapp: string;
    wilaya_id: number;
    commune: string;
    address_line: string;
    latitude: number | null;
    longitude: number | null;
    opening_hours: { open: string; close: string; closed_days: number[] };
    logo_url?: string;
    cover_url?: string;
    instagram_url?: string | null;
    facebook_url?: string | null;
    category?: string | null;
    subcategories?: string[] | null;
  },
) {
  const data: Record<string, unknown> = { ...patch };
  // روابط التواصل: تُحفظ فقط إذا كانت الأعمدة موجودة (هجرة 202610130001)
  if (patch.instagram_url !== undefined || patch.facebook_url !== undefined) {
    const support = await fetchSchemaSupport();
    if (!support.storeSocials) {
      delete data["instagram_url"];
      delete data["facebook_url"];
    }
  }
  // تصنيف المتجر وفئاته الفرعية: يحتاج هجرة 202610160001 — يُتجاهل بهدوء قبل تطبيقها
  if (patch.category !== undefined || patch.subcategories !== undefined) {
    const support = await fetchSchemaSupport();
    if (!support.storeCategories) {
      delete data["category"];
      delete data["subcategories"];
    } else if (patch.category) {
      data["category"] = resolveCategoryId(patch.category);
    }
  }
  const { error } = await supabase
    .from("stores")
    .update(data as Database["public"]["Tables"]["stores"]["Update"])
    .eq("id", storeId);
  if (error) throw error;
}


// ---------- Wallet ----------

export type WalletTxType = "topup" | "purchase" | "refund" | "withdraw";

export interface WalletTransaction {
  id: string;
  user_id: string;
  type: WalletTxType;
  amount: number;
  status: "pending" | "approved" | "rejected";
  method: string | null;
  note: string | null;
  receipt_url: string | null;
  created_at: string;
}

export interface WalletSummary {
  balance: number;
  totalTopup: number;
  totalWithdraw: number;
}

export async function fetchWalletTransactions(): Promise<WalletTransaction[]> {
  const sb = supabase as unknown as DynamicTableClient;
  const { data, error } = await sb
    .from("wallet_transactions")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as WalletTransaction[];
}

export function summarizeWallet(list: WalletTransaction[]): WalletSummary {
  const approved = list.filter((t) => t.status === "approved");
  const balance = approved.reduce((sum, t) => sum + t.amount, 0);
  const totalTopup = approved
    .filter((t) => t.type === "topup" || t.type === "refund")
    .reduce((sum, t) => sum + t.amount, 0);
  const totalWithdraw = approved
    .filter((t) => t.type === "withdraw" || t.type === "purchase")
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);
  return { balance, totalTopup, totalWithdraw };
}

export async function walletTopup(params: {
  amount: number;
  receiptUrl: string;
  method: string;
}): Promise<void> {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;
  if (!authData.user) throw new Error(ERRORS["not_authenticated"]);

  const sb = supabase as unknown as DynamicTableClient;
  const { error } = await sb.from("wallet_transactions").insert({
    user_id: authData.user.id,
    type: "topup",
    amount: params.amount,
    status: "pending",
    method: params.method,
    receipt_url: params.receiptUrl,
  });
  if (error) throw error;
}

export async function walletWithdraw(params: {
  amount: number;
  method: string;
  note?: string | null;
}): Promise<void> {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;
  if (!authData.user) throw new Error(ERRORS["not_authenticated"]);

  const sb = supabase as unknown as DynamicTableClient;
  const { error } = await sb.from("wallet_transactions").insert({
    user_id: authData.user.id,
    type: "withdraw",
    amount: -Math.abs(params.amount),
    status: "pending",
    method: params.method,
    note: params.note ?? null,
  });
  if (error) throw error;
}

// ---------- Orders ----------


export type MerchantTrackingStatus = "preparing" | "ready_for_dispatch" | "out_for_delivery" | "delivered";
export type MerchantTrackingEvent = {
  id: string;
  merchant_order_id: string;
  status: MerchantTrackingStatus;
  note: string | null;
  created_at: string;
  created_by: string;
};

export async function fetchMerchantOrderTracking(merchantOrderId: string): Promise<MerchantTrackingEvent[]> {
  const rpc = supabase.rpc.bind(supabase) as unknown as (
    fn: string, args: { _merchant_order_id: string }
  ) => Promise<{ data: MerchantTrackingEvent[] | null; error: unknown }>;
  const { data, error } = await rpc("fetch_merchant_order_tracking", { _merchant_order_id: merchantOrderId });
  if (error) throw new Error(friendlyError(error));
  return data ?? [];
}

export async function merchantUpdateOrderTracking(
  merchantOrderId: string,
  status: MerchantTrackingStatus,
  note?: string,
): Promise<MerchantTrackingEvent> {
  const rpc = supabase.rpc.bind(supabase) as unknown as (
    fn: string, args: { _merchant_order_id: string; _status: string; _note: string | null }
  ) => Promise<{ data: MerchantTrackingEvent | null; error: unknown }>;
  const { data, error } = await rpc("merchant_update_order_tracking", {
    _merchant_order_id: merchantOrderId, _status: status, _note: note?.trim() || null,
  });
  if (error) throw new Error(friendlyError(error));
  if (!data) throw new Error("تعذر حفظ تحديث التتبع");
  return data;
}
