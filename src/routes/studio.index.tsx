import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  BadgeCheck,
  Check,
  ChevronLeft,
  Clock,
  Eye,
  MapPin,
  Package,
  Settings,
  ShoppingBag,
  Star,
  Store,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { showError, showSuccess } from "@/lib/feedback";
import { translate, useTranslation } from "@/lib/i18n";
import { useRealtimeSubscription } from "@/hooks/use-realtime";
import { logNetError } from "@/lib/conn";
import { OrderStatusBadge } from "@/components/sooqy/badges";
import { DashboardLoadingSkeleton } from "@/components/sooqy/skeleton";
import { useAuth } from "@/lib/auth";
import {
  fetchMyStore,
  fetchStoreOrderItems,
  fetchStoreReservations,
  merchantAddOfferImages,
  merchantConfirmReservation,
  merchantCreateStore,
  merchantDeleteOffer,
  merchantArchiveReservation,
  merchantArchiveOrderItems,
  merchantRemoveOfferImage,
  merchantReplaceOfferImage,
  merchantSetPrimaryImage,
  merchantToggleAvailability,
  merchantUpdateOffer,
  merchantUpdateProduct,
  fetchMyRoles,
  fetchMyAccountType,
  inventoryLevel,
  type OfferFull,
} from "@/lib/sooqy";
import { ImageUploader, type ImageUploaderItem } from "@/components/sooqy/image-uploader";
import { formatDA, geoErrorMessage, getStoreStatus, useGeo } from "@/lib/geo";
import {
  DEFAULT_CATEGORY_ID,
  MAIN_CATEGORIES,
  OTHER_CATEGORIES,
  childrenOf,
  parentOf,
  resolveCategoryId,
} from "@/lib/taxonomy";
import { DirectionsButton } from "@/components/sooqy/DirectionsButton";
import { ConfirmDialog } from "@/components/sooqy/confirm-dialog";
import { SideSheet } from "@/components/sooqy/side-sheet";
import { StudioProductRow } from "@/components/sooqy/studio-product-row";
import {
  MerchantOnboarding,
  type StoreForm,
  defaultStoreForm,
} from "@/components/sooqy/merchant-onboarding";
import { ErrorState } from "@/components/sooqy/error-state";
import { PageHeader } from "@/components/sooqy/page-header";
import { AppShell } from "@/components/sooqy/app-shell";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/studio/")({
  head: () => ({
    meta: [
      { title: translate("studio_meta_title") },
      { name: "description", content: translate("studio_meta_description") },
    ],
  }),
  component: StudioPage,
});

function StudioPage() {
  const { user, ready } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [mode, setMode] = useState<"offers" | "orders">("offers");
  const { t } = useTranslation();
  const [pendingDelete, setPendingDelete] = useState<OfferFull | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [pendingHistoryDelete, setPendingHistoryDelete] = useState<
    { kind: "reservation"; id: string } | { kind: "order"; id: string } | null
  >(null);
  const [deletingHistory, setDeletingHistory] = useState(false);
  const [storeForm, setStoreForm] = useState({
    name: "",
    phone: "",
    whatsapp: "",
    wilaya_id: null as number | null,
    commune: "",
    address_line: "",
    open: "09:00",
    close: "18:00",
    latitude: null as number | null,
    longitude: null as number | null,
    category: null as string | null,
    subcategories: [] as string[],
  });
  const [showVerificationInfo, setShowVerificationInfo] = useState(false);
  const [busy, setBusy] = useState(false);
  // الطلب قيد التحديث — يمنع الإرسال المزدوج ويعرف أي بطاقة تُعطّل.
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [productQuery, setProductQuery] = useState("");
  const [productFilter, setProductFilter] = useState<"all" | "low" | "out">("all");
  const [rowBusyId, setRowBusyId] = useState<string | null>(null);
  const [editing, setEditing] = useState<OfferFull | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    price: "",
    stock: "",
    category: DEFAULT_CATEGORY_ID,
    brand: "",
    description: "",
  });
  const [editImages, setEditImages] = useState<File[]>([]);
  const [editExistingImages, setEditExistingImages] = useState<ImageUploaderItem[]>([]);
  const [managingImageOfferId, setManagingImageOfferId] = useState<string | null>(null);
  const [managingImages, setManagingImages] = useState<ImageUploaderItem[]>([]);

  const roles = useQuery({
    queryKey: ["my-roles"],
    queryFn: fetchMyRoles,
    enabled: !!user,
  });
  const accountType = useQuery({
    queryKey: ["my-account-type", user?.id],
    queryFn: fetchMyAccountType,
    enabled: !!user,
  });
  const canManage = accountType.data === "merchant" && (roles.data?.includes("merchant") ?? false);
  const store = useQuery({ queryKey: ["my-store"], queryFn: fetchMyStore, enabled: !!user });
  const offers = useQuery({
    queryKey: ["my-store-offers", store.data?.id],
    queryFn: async () => {
      const sid = store.data?.id;
      if (!sid) return [];
      const data = await import("@/lib/sooqy").then((m) => m.getStoreOffers(sid));
      return data;
    },
    enabled: !!store.data && canManage,
  });
  const reservations = useQuery({
    queryKey: ["store-reservations", store.data?.id],
    queryFn: async () => {
      const sid = store.data?.id;
      if (!sid) return [];
      return import("@/lib/sooqy").then((m) => m.fetchStoreReservations(sid));
    },
    enabled: !!store.data,
  });
  const orders = useQuery({
    queryKey: ["store-orders", store.data?.id],
    queryFn: async () => {
      const sid = store.data?.id;
      if (!sid) return [];
      return import("@/lib/sooqy").then((m) => m.fetchStoreOrderItems(sid));
    },
    enabled: !!store.data,
  });
  useRealtimeSubscription({ table: "store_offers", filter: store.data?.id ? "store_id=eq." + store.data.id : undefined, queryKeys: [["my-store-offers", store.data?.id ?? ""]], enabled: !!store.data?.id });
  useRealtimeSubscription({ table: "reservations", filter: store.data?.id ? "store_id=eq." + store.data.id : undefined, queryKeys: [["store-reservations", store.data?.id ?? ""]], enabled: !!store.data?.id });
  useRealtimeSubscription({ table: "order_items", filter: store.data?.id ? "store_id=eq." + store.data.id : undefined, queryKeys: [["store-orders", store.data?.id ?? ""]], enabled: !!store.data?.id });
  useRealtimeSubscription({ table: "merchant_orders", filter: store.data?.id ? "store_id=eq." + store.data.id : undefined, queryKeys: [["store-orders", store.data?.id ?? ""]], enabled: !!store.data?.id });

  const dashboardError = offers.error ?? reservations.error ?? orders.error;

  if (!ready) return null;
  if (!user) {
    return <AuthGate onLogin={() => navigate({ to: "/auth", search: { redirect: "/studio" } })} />;
  }
  if (store.isLoading || roles.isLoading || accountType.isLoading) {
    return <DashboardLoadingSkeleton cards={3} />;
  }
  if (store.isError || roles.isError || accountType.isError) {
    const error = store.error ?? roles.error ?? accountType.error;
    return (
      <div className="mx-auto max-w-xl space-y-4 px-4 pt-6">
        <PageHeader title={t("studio_title")} back="/" />
        <ErrorState
          scope="studio:account"
          error={error}
          onRetry={async () => {
            await Promise.all([store.refetch(), roles.refetch(), accountType.refetch()]);
          }}
        />
      </div>
    );
  }
  if (!canManage) {
    return (
      <div className="mx-auto max-w-xl space-y-4 px-4 pt-16 text-center">
        <Store className="mx-auto size-12 text-accent-ink" />
        <h1 className="text-h1 text-foreground">{t("studio_title")}</h1>
        <p className="text-sm text-muted-foreground">{t("studio_login_store_settings")}</p>
        <Link to="/profile" className="btn-primary mx-auto inline-flex px-8">
          {t("profile_hub_title")}
        </Link>
      </div>
    );
  }

  if (store.isSuccess && store.data === null) {
    return (
      <MerchantOnboarding
        onSubmit={async (input) => {
          await merchantCreateStore(input);
          await qc.invalidateQueries({ queryKey: ["my-store"] });
          await store.refetch();
        }}
        form={storeForm}
        setForm={setStoreForm}
      />
    );
  }

  if (dashboardError) {
    return (
      <div className="mx-auto max-w-xl space-y-4 px-4 pt-6">
        <PageHeader title={t("studio_title")} back="/" />
        <ErrorState
          scope="studio:dashboard-data"
          error={dashboardError}
          onRetry={async () => {
            await Promise.all([offers.refetch(), reservations.refetch(), orders.refetch()]);
          }}
        />
      </div>
    );
  }

  const editDirty =
    !!editing &&
    (editForm.name !== editing.product.name ||
      editForm.price !== String(editing.price) ||
      editForm.stock !== String(editing.stock_quantity) ||
      editForm.category !== editing.product.category ||
      editForm.brand !== (editing.product.brand ?? "") ||
      editForm.description !== (editing.product.description ?? "") ||
      editImages.length > 0);
  // يمنع ضياع تعديلات غير محفوظة عند الإغلاق بالخطأ (سحب/خلفية/Escape).
  const requestCloseEdit = () => {
    if (editDirty) setConfirmDiscard(true);
    else setEditing(null);
  };

  const startEdit = (o: OfferFull) => {
    setEditing(o);
    setEditForm({
      name: o.product.name,
      price: String(o.price),
      stock: String(o.stock_quantity),
      category: o.product.category,
      brand: o.product.brand ?? "",
      description: o.product.description ?? "",
    });
    setEditImages([]);
    setEditExistingImages(
      (o.images ?? []).map((img) => ({
        file: null as unknown as File,
        preview: img.image_url,
        isPrimary: img.is_primary,
      })),
    );
  };

  const saveEdit = async () => {
    if (!editing) return;
    const clean = editForm.name.trim();
    const price = Number(editForm.price);
    const stock = Number(editForm.stock);
    if (
      !clean ||
      !editForm.price.trim() ||
      !Number.isFinite(price) ||
      price <= 0 ||
      !editForm.stock.trim() ||
      !Number.isInteger(stock) ||
      stock < 0 ||
      stock > 9999
    ) {
      toast.error(t("studio_product_required_fields"));
      return;
    }
    setBusy(true);
    try {
      await merchantUpdateProduct(editing.product_id, {
        name: clean,
        description: editForm.description.trim() || null,
        brand: editForm.brand.trim() || null,
        category: editForm.category,
      });
      await merchantUpdateOffer(editing.id, {
        price,
        stock_quantity: stock,
      });

      // رفع الصور الجديدة (التي تحتوي على File) إن وجدت
      const newEditFiles = editExistingImages.map((i) => i.file).filter((f): f is File => !!f);
      if (newEditFiles.length) {
        await merchantAddOfferImages(editing.id, newEditFiles);
      }

      showSuccess(t("studio_product_updated"));
      setEditing(null);
      setEditImages([]);
      setEditExistingImages([]);
      await qc.invalidateQueries({ queryKey: ["my-store-offers", store.data?.id] });
    } catch (error) {
      showError(error);
    } finally {
      setBusy(false);
    }
  };

  const removeEditImage = async (item: ImageUploaderItem) => {
    if (!editing || !item.id) return;
    try {
      await merchantRemoveOfferImage(item.id);
      setEditExistingImages((prev) => prev.filter((i) => i.id !== item.id));
      await qc.invalidateQueries({ queryKey: ["my-store-offers", store.data?.id] });
      showSuccess(t("studio_image_deleted"));
    } catch (error) {
      showError(error, "feedback_upload_error");
    }
  };

  const setEditPrimaryImage = async (item: ImageUploaderItem) => {
    if (!editing || !item.id) return;
    try {
      await merchantSetPrimaryImage(item.id);
      setEditExistingImages((prev) => prev.map((i) => ({ ...i, isPrimary: i.id === item.id })));
      await qc.invalidateQueries({ queryKey: ["my-store-offers", store.data?.id] });
    } catch (error) {
      showError(error);
    }
  };

  const openImageManagement = (offer: OfferFull) => {
    setManagingImageOfferId(offer.id);
    setManagingImages(
      (offer.images ?? []).map((img) => ({
        id: img.id,
        file: null as unknown as File,
        preview: img.image_url,
        isPrimary: img.is_primary,
      })),
    );
  };

  const closeImageManagement = () => {
    setManagingImageOfferId(null);
    setManagingImages([]);
  };

  const removeManagingImage = async (item: ImageUploaderItem) => {
    if (!managingImageOfferId || !item.id) return;
    try {
      await merchantRemoveOfferImage(item.id);
      setManagingImages((prev) => prev.filter((i) => i.id !== item.id));
      await qc.invalidateQueries({ queryKey: ["my-store-offers", store.data?.id] });
      showSuccess(t("studio_image_deleted"));
    } catch (error) {
      showError(error, "feedback_upload_error");
    }
  };

  const setManagingPrimaryImage = async (item: ImageUploaderItem) => {
    if (!managingImageOfferId || !item.id) return;
    try {
      await merchantSetPrimaryImage(item.id);
      setManagingImages((prev) => prev.map((i) => ({ ...i, isPrimary: i.id === item.id })));
      await qc.invalidateQueries({ queryKey: ["my-store-offers", store.data?.id] });
    } catch (error) {
      showError(error);
    }
  };

  const pendingCount =
    (reservations.data?.filter((r) => r.status === "pending").length ?? 0) +
    (orders.data?.filter((o) => o.merchant_order.status === "pending").length ?? 0);

  // الطلبات التي تحتاج إجراءً — تظهر في أعلى مساحة العمل
  const actionOrders = (orders.data ?? []).filter((o) => o.merchant_order.status === "pending");
  const actionReservations = (reservations.data ?? []).filter((r) => r.status === "pending");

  // ——— قائمة المنتجات: بحث/فلترة محليان (بلا استدعاءات إضافية) وعمليات سريعة ———
  const allOffers = offers.data ?? [];
  const lowCount = allOffers.filter((o) => inventoryLevel(o) === "low").length;
  const outCount = allOffers.filter((o) => inventoryLevel(o) === "out").length;
  const normalizedQuery = productQuery.trim().toLowerCase();
  const visibleOffers = allOffers.filter(
    (o) =>
      (productFilter === "all" || inventoryLevel(o) === productFilter) &&
      (!normalizedQuery ||
        o.product.name.toLowerCase().includes(normalizedQuery) ||
        (o.product.brand ?? "").toLowerCase().includes(normalizedQuery)),
  );

  const refreshOffers = () =>
    qc.invalidateQueries({ queryKey: ["my-store-offers", store.data?.id] });

  const changeStock = async (o: OfferFull, next: number) => {
    const clamped = Math.max(0, Math.min(9999, Math.floor(next)));
    if (rowBusyId || clamped === o.stock_quantity) return;
    setRowBusyId(o.id);
    try {
      // The database derives availability while preserving the merchant's
      // independent hidden/visible choice, including when stock is restored.
      await merchantUpdateOffer(o.id, { stock_quantity: clamped });
      await refreshOffers();
    } catch {
      toast.error(t("studio_stock_failed"));
    } finally {
      setRowBusyId(null);
    }
  };

  const toggleOfferVisibility = async (o: OfferFull) => {
    if (rowBusyId) return;
    setRowBusyId(o.id);
    try {
      await merchantToggleAvailability(o.id, !o.is_merchant_hidden);
      await refreshOffers();
    } catch {
      toast.error(t("studio_toggle_failed"));
    } finally {
      setRowBusyId(null);
    }
  };

  return (
    <AppShell width="wide" className="min-w-0 space-y-5 overflow-x-clip pb-28 pt-3 lg:space-y-7 lg:pt-8">
      <header className="flex min-w-0 flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="mt-1 text-2xl font-black tracking-tight text-foreground sm:text-3xl">
            {t("studio_dashboard_heading")}
          </h1>
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
            {t("studio_dashboard_intro")}
          </p>
        </div>
        <div className="flex size-11 items-center justify-center rounded-[var(--radius-control)] bg-primary text-primary-foreground">
          <Store className="size-5" />
        </div>
      </header>

      {/* بطاقة المتجر الرئيسية */}
      <section className="relative isolate overflow-hidden rounded-[var(--radius-card)] border border-border bg-card p-3.5 sm:p-5">
        <div className="pointer-events-none absolute -end-12 -top-20 size-56 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3 sm:gap-4">
            <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-border bg-background sm:size-16">
              {store.data?.logo_url ? (
                <img
                  src={store.data.logo_url}
                  alt={t("studio_store_logo_alt", { name: store.data.name })}
                  loading="lazy"
                  decoding="async"
                  className="size-full object-cover"
                />
              ) : (
                <Store className="size-7 text-accent-ink" />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-caption font-bold tracking-wide text-accent-ink">
                {t("studio_store_on_arownd")}
              </p>
              <div className="mt-1 flex min-w-0 items-center gap-1.5">
                <h2 className="min-w-0 truncate text-xl font-black sm:text-2xl">
                  {store.data?.name}
                </h2>
                {store.data?.is_verified && (
                  <span className="relative inline-flex shrink-0">
                    <button
                      type="button"
                      aria-label={t("studio_verification_aria")}
                      aria-expanded={showVerificationInfo}
                      aria-describedby={showVerificationInfo ? "studio-verification-tooltip" : undefined}
                      onClick={() => setShowVerificationInfo((open) => !open)}
                      className="inline-flex size-7 items-center justify-center rounded-full text-accent-ink transition hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <BadgeCheck className="size-5" />
                    </button>
                    {showVerificationInfo && (
                      <span
                        id="studio-verification-tooltip"
                        role="status"
                        className="absolute start-1/2 top-full z-50 mt-2 w-max max-w-[min(14rem,80vw)] -translate-x-1/2 rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground shadow-lg"
                      >
                        {t("studio_verified_badge")}
                      </span>
                    )}
                  </span>
                )}
              </div>
              <p className="mt-1 flex items-center gap-1 truncate text-xs text-muted-foreground">
                <MapPin className="size-3 shrink-0" />
                {store.data?.commune || t("studio_location_setup_pending")}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {(() => {
                  const st = getStoreStatus(store.data?.opening_hours);
                  return (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-caption font-bold">
                      <span
                        className={cn(
                          "size-1.5 rounded-full",
                          st.isOpen ? "bg-primary" : "bg-muted-foreground/40",
                        )}
                      />
                      {st.isOpen ? t("studio_store_open_now") : t("studio_store_closed_now")}
                    </span>
                  );
                })()}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:min-w-[var(--layout-studio-grid-min)]">
            <Link
              to="/studio/settings"
              className="flex min-h-[var(--control-height-compact)] items-center justify-center gap-2 rounded-[var(--radius-control)] bg-primary px-3 text-xs font-extrabold text-primary-foreground transition hover:brightness-95 active:scale-[var(--scale-pressed)]"
            >
              <Settings className="size-4" /> {t("studio_customize_store")}
            </Link>
            <Link
              to="/stores/$storeId"
              params={{ storeId: store.data?.id ?? "" }}
              className="flex min-h-[var(--control-height-compact)] items-center justify-center gap-2 rounded-[var(--radius-control)] border border-border bg-card px-3 text-xs font-bold text-foreground transition hover:bg-muted active:scale-[var(--scale-pressed)]"
            >
              <Eye className="size-4" /> {t("studio_preview_store")}
            </Link>
          </div>
        </div>
      </section>

      {/* تنبيه المخزون: يظهر فقط عند وجود منتجات منخفضة/نافدة */}
      {lowCount + outCount > 0 && (
        <button
          type="button"
          onClick={() => {
            setMode("offers");
            setProductFilter(outCount > 0 ? "out" : "low");
          }}
          className="flex min-h-[var(--control-height-compact)] w-full items-center justify-between gap-3 rounded-[var(--radius-card)] border border-warning/30 bg-warning-soft px-4 py-3 text-start text-sm font-bold text-warning"
        >
          <span>{t("studio_low_stock_alert", { count: lowCount + outCount })}</span>
          <span className="shrink-0 rounded-full bg-warning px-3 py-1 text-xs text-foreground">
            {t("studio_low_stock_review")}
          </span>
        </button>
      )}

      {/* مؤشرات المتجر */}
      <section className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="text-base font-extrabold text-foreground">{t("studio_overview")}</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">{t("studio_live_summary")}</p>
          </div>
          <span className="rounded-full border border-border bg-card px-2.5 py-1 text-caption font-semibold text-muted-foreground">
            {t("studio_store_data")}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
          <div className="rounded-[var(--radius-card)] border border-border bg-card p-3 sm:p-4">
            <div className="flex items-center justify-between gap-2">
              <span className="flex size-9 items-center justify-center rounded-[var(--radius-control)] bg-primary-soft text-accent-ink">
                <Package className="size-4.5" />
              </span>
              <span className="text-caption font-semibold text-muted-foreground">
                {t("studio_catalog")}
              </span>
            </div>
            <p className="mt-3 text-2xl font-black tabular-nums">{offers.data?.length ?? 0}</p>
            <p className="mt-0.5 text-xs font-semibold text-muted-foreground">
              {t("studio_total_products")}
            </p>
          </div>
          <div className="rounded-[var(--radius-card)] border border-border bg-card p-3.5  sm:p-4">
            <div className="flex items-center justify-between gap-2">
              <span className="flex size-9 items-center justify-center rounded-[var(--radius-control)] bg-warning-soft text-warning">
                <ShoppingBag className="size-4.5" />
              </span>
              <span className="text-caption font-semibold text-muted-foreground">
                {t("studio_follow_up")}
              </span>
            </div>
            <p className="mt-3 text-2xl font-black tabular-nums">{pendingCount}</p>
            <p className="mt-0.5 text-xs font-semibold text-muted-foreground">
              {t("studio_pending_orders_reservations")}
            </p>
          </div>
          <div className="rounded-[var(--radius-card)] border border-border bg-card p-3.5  sm:p-4">
            <div className="flex items-center justify-between gap-2">
              <span className="flex size-9 items-center justify-center rounded-[var(--radius-control)] bg-muted text-muted-foreground">
                <Eye className="size-4.5" />
              </span>
              <span className="text-caption font-semibold text-muted-foreground">
                {t("studio_reach")}
              </span>
            </div>
            <p className="mt-3 text-2xl font-black tabular-nums">
              {offers.data
                ? offers.data.reduce((sum, o) => sum + (o.product.view_count ?? 0), 0)
                : "—"}
            </p>
            <p className="mt-0.5 text-xs font-semibold text-muted-foreground">
              {t("studio_product_views")}
            </p>
          </div>
          <div className="rounded-[var(--radius-card)] border border-border bg-card p-3.5  sm:p-4">
            <div className="flex items-center justify-between gap-2">
              <span className="flex size-9 items-center justify-center rounded-[var(--radius-control)] bg-success-soft text-success">
                <Star className="size-4.5" />
              </span>
              <span className="text-caption font-semibold text-muted-foreground">
                {t("studio_store_reputation")}
              </span>
            </div>
            <p className="mt-3 text-2xl font-black tabular-nums">
              {store.data?.rating ? Number(store.data.rating).toFixed(1) : "—"}
            </p>
            <p className="mt-0.5 text-xs font-semibold text-muted-foreground">
              {t("studio_average_rating")}
            </p>
          </div>
        </div>
      </section>

      {/* إكمال إعداد المتجر */}
      {(() => {
        const s = store.data;
        const items = [
          { label: t("studio_setup_store_name"), done: !!s?.name },
          { label: t("studio_setup_store_logo"), done: !!s?.logo_url },
          { label: t("studio_setup_first_product"), done: (offers.data?.length ?? 0) > 0 },
          { label: t("studio_setup_contact_phone"), done: !!s?.phone },
        ];
        const done = items.filter((i) => i.done).length;
        const pct = Math.round((done / items.length) * 100);
        if (pct === 100) return null;
        return (
          <section className="rounded-[var(--radius-card)] border border-accent-ink/25 bg-primary-soft/40 p-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-extrabold text-foreground">
                {t("studio_setup_heading")}
              </h2>
              <span className="text-xs font-bold text-accent-ink">{pct}%</span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-primary/15">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
            <ul className="mt-3 space-y-1.5">
              {items.map((i) => (
                <li key={i.label} className="flex items-center gap-2 text-xs">
                  <span
                    className={cn(
                      "flex size-4 items-center justify-center rounded-full",
                      i.done ? "bg-success text-foreground" : "border border-accent-ink/40 bg-card",
                    )}
                  >
                    {i.done && <Check className="size-2.5" />}
                  </span>
                  <span
                    className={
                      i.done ? "text-muted-foreground line-through" : "font-bold text-foreground"
                    }
                  >
                    {i.label}
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex gap-2">
              <Link
                to="/studio/settings"
                className="flex-1 rounded-[var(--radius-control)] bg-primary py-2 text-center text-xs font-bold text-primary-foreground transition active:scale-95"
              >
                {t("studio_setup_continue")}
              </Link>
              <Link
                to="/stores/$storeId"
                params={{ storeId: s?.id ?? "" }}
                className="flex-1 rounded-[var(--radius-control)] border border-accent-ink/30 bg-card py-2 text-center text-xs font-bold text-accent-ink transition active:scale-95"
              >
                {t("studio_preview_my_store")}
              </Link>
            </div>
          </section>
        );
      })()}

      {/* طلبات تحتاج إجراءً — أول ما يراه التاجر */}
      {(actionOrders.length > 0 || actionReservations.length > 0) && (
        <section className="space-y-2">
          <h2 className="px-1 text-section text-muted-foreground">
            {t("studio_action_needed_now")}
          </h2>
          <div className="divide-y divide-border overflow-hidden rounded-[var(--radius-card)] border border-border bg-card">
            {actionOrders.map((o) => (
              <Link
                key={o.order.id}
                to="/studio/orders/$orderId"
                params={{ orderId: o.order.id }}
                className="flex min-h-[4.5rem] items-center gap-3 p-3 text-start transition-colors hover:bg-muted/50 active:bg-muted/70"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-control)] bg-danger-soft text-danger">
                  <ShoppingBag className="size-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold text-foreground">
                    {t("studio_order_hash", { id: o.order.id.slice(0, 8) })}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {o.quantity} × {o.product_name}
                  </span>
                </span>
                <ChevronLeft className="size-4 shrink-0 text-muted-foreground" />
              </Link>
            ))}
            {actionReservations.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setMode("orders")}
                className="flex min-h-[4.5rem] w-full items-center gap-3 p-3 text-start transition-colors hover:bg-muted/50 active:bg-muted/70"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-control)] bg-warning-soft text-warning">
                  <Clock className="size-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold text-foreground">
                    {t("studio_pending_reservation")}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {t("studio_product_units", { name: r.offer?.product.name ?? t("studio_product_name_label"), count: r.quantity })}
                  </span>
                </span>
                <ChevronLeft className="size-4 shrink-0 text-muted-foreground" />
              </button>
            ))}
          </div>
        </section>
      )}

      {/* قائمة إدارة المتجر */}
      <section className="space-y-2">
        <h2 className="px-1 text-section text-muted-foreground">{t("studio_manage_store")}</h2>
        <div className="divide-y divide-border overflow-hidden rounded-[var(--radius-card)] border border-border bg-card">
          <button
            type="button"
            onClick={() => setMode("offers")}
            className="flex min-h-[4.5rem] w-full items-center gap-3 p-3 text-start transition-colors hover:bg-muted/50 active:bg-muted"
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-control)] bg-primary-soft text-accent-ink">
              <Package className="size-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-bold text-foreground">
                {t("studio_my_products")}
              </span>
              <span className="block text-xs text-muted-foreground">
                {t("studio_manage_products_hint")}
              </span>
            </span>
            <ChevronLeft className="size-4 shrink-0 text-muted-foreground" />
          </button>
          <button
            type="button"
            onClick={() => setMode("orders")}
            className="flex w-full items-center gap-3 p-3.5 text-start transition active:bg-muted"
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-control)] bg-primary-soft text-accent-ink">
              <ShoppingBag className="size-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-bold text-foreground">{t("studio_orders")}</span>
              <span className="block text-xs text-muted-foreground">
                {t("studio_manage_orders_hint")}
              </span>
            </span>
            {pendingCount > 0 && (
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-danger text-caption font-bold text-foreground">
                {pendingCount}
              </span>
            )}
            <ChevronLeft className="size-4 shrink-0 text-muted-foreground" />
          </button>
</div>
      </section>

      {/* تبويب المنتجات */}
      {mode === "offers" && (
        <section className="space-y-5">
          <div className="rounded-[var(--radius-card)] border border-border bg-card p-3.5 sm:p-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="font-extrabold">{t("studio_current_products")}</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {t("studio_results_shown", { count: visibleOffers.length })}
                </p>
              </div>
              <span className="rounded-full bg-primary-soft px-3 py-1 text-caption font-bold text-accent-ink">
                {t("studio_inventory")}
              </span>
            </div>

            <SideSheet
              open={!!editing}
              onOpenChange={(o) => {
                if (!o) requestCloseEdit();
              }}
              title={t("studio_edit_product_title")}
              description={t("studio_edit_product_desc")}
              footer={
                <button
                  type="button"
                  onClick={saveEdit}
                  disabled={busy}
                  className="btn-primary w-full py-3 disabled:opacity-50"
                >
                  {busy ? t("studio_saving") : t("studio_save_changes")}
                </button>
              }
            >
              <div className="grid min-w-0 gap-3">
                <input
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  placeholder={t("studio_product_name_ph")}
                  className="h-[var(--control-height-compact)] w-full min-w-0 max-w-full box-border rounded-[var(--radius-control)] border border-input bg-background px-3 outline-none transition focus:ring-2 focus:ring-primary/30"
                />
                <div className="grid min-w-0 grid-cols-2 gap-2">
                  <input
                    value={editForm.price}
                    onChange={(e) => setEditForm({ ...editForm, price: e.target.value })}
                    placeholder={t("studio_price_dzd_ph")}
                    type="number"
                    min="0"
                    className="h-[var(--control-height-compact)] w-full min-w-0 max-w-full box-border rounded-[var(--radius-control)] border border-input bg-background px-3 outline-none transition focus:ring-2 focus:ring-primary/30"
                  />
                  <input
                    value={editForm.stock}
                    onChange={(e) => setEditForm({ ...editForm, stock: e.target.value })}
                    placeholder={t("studio_quantity_ph")}
                    type="number"
                    min="0"
                    className="h-[var(--control-height-compact)] w-full min-w-0 max-w-full box-border rounded-[var(--radius-control)] border border-input bg-background px-3 outline-none transition focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <CategorySelect
                  value={editForm.category}
                  onChange={(category) => setEditForm({ ...editForm, category })}
                />
                <input
                  value={editForm.brand}
                  onChange={(e) => setEditForm({ ...editForm, brand: e.target.value })}
                  placeholder={t("studio_brand_ph")}
                  className="h-[var(--control-height-compact)] w-full rounded-[var(--radius-control)] border border-input bg-background px-3 outline-none transition focus:ring-2 focus:ring-primary/30"
                />
                <textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  placeholder={t("studio_description_ph")}
                  rows={2}
                  className="min-h-24 w-full min-w-0 max-w-full box-border rounded-[var(--radius-control)] border border-input bg-background px-4 py-3 outline-none transition focus:border-accent-ink focus:ring-2 focus:ring-primary/20"
                />
                <ImageUploader
                  initialItems={editExistingImages}
                  onChange={setEditExistingImages}
                  label={t("studio_manage_product_images_label")}
                  onRemove={removeEditImage}
                  onSetPrimary={setEditPrimaryImage}
                />
                {editImages.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {t("studio_new_images_uploading", { count: editImages.length })}
                  </p>
                )}
              </div>
            </SideSheet>

            {/* إدارة الصور لمنتج محدد */}
            <SideSheet
              open={!!managingImageOfferId}
              onOpenChange={(o) => {
                if (!o) closeImageManagement();
              }}
              title={t("studio_manage_images_title")}
              description={t("studio_manage_images_desc")}
            >
              <ImageUploader
                initialItems={managingImages}
                onChange={async (items) => {
                  const newFiles = items.filter((i) => i.file).map((i) => i.file);
                  if (newFiles.length && managingImageOfferId) {
                    try {
                      await merchantAddOfferImages(managingImageOfferId, newFiles);
                      await qc.invalidateQueries({
                        queryKey: ["my-store-offers", store.data?.id],
                      });
                      showSuccess(t("studio_images_uploaded"));
                      closeImageManagement();
                    } catch (error) {
                      showError(error, "feedback_upload_error");
                    }
                    return;
                  }
                  setManagingImages(items);
                }}
                label={t("studio_manage_product_images_label")}
                onRemove={removeManagingImage}
                onSetPrimary={setManagingPrimaryImage}
              />
            </SideSheet>

            <div className="mb-4 space-y-3 rounded-2xl bg-muted/40 p-2.5 sm:p-3">
              <input
                type="search"
                value={productQuery}
                onChange={(e) => setProductQuery(e.target.value)}
                placeholder={t("studio_products_search_ph")}
                aria-label={t("studio_products_search_ph")}
                className="h-[var(--control-height-compact)] w-full rounded-[var(--radius-control)] border border-input bg-background px-3 text-sm outline-none transition focus:ring-2 focus:ring-primary/30"
              />
              <div className="no-scrollbar flex gap-2 overflow-x-auto" role="tablist">
                {(
                  [
                    { id: "all", label: t("studio_filter_all"), count: allOffers.length },
                    { id: "low", label: t("studio_filter_low"), count: lowCount },
                    { id: "out", label: t("studio_filter_out"), count: outCount },
                  ] as const
                ).map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    role="tab"
                    aria-selected={productFilter === f.id}
                    onClick={() => setProductFilter(f.id)}
                    className={cn(
                      "min-h-[var(--control-height-compact)] shrink-0 rounded-full border px-4 text-xs font-bold transition",
                      productFilter === f.id
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-card text-muted-foreground",
                    )}
                  >
                    {t("studio_filter_label", { label: f.label, count: f.count })}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              {visibleOffers.map((offer) => (
                <StudioProductRow
                  key={offer.id}
                  offer={offer}
                  busy={rowBusyId === offer.id}
                  onStockChange={(next) => void changeStock(offer, next)}
                  onToggle={() => void toggleOfferVisibility(offer)}
                  onEdit={() => startEdit(offer)}
                  onImages={() => openImageManagement(offer)}
                  onDelete={() => setPendingDelete(offer)}
                />
              ))}
              {!allOffers.length && (
                <p className="py-3 text-center text-sm text-muted-foreground">
                  {t("studio_no_products")}
                </p>
              )}
              {allOffers.length > 0 && visibleOffers.length === 0 && (
                <p className="py-3 text-center text-sm text-muted-foreground">
                  {t("studio_no_results")}
                </p>
              )}
            </div>
          </div>
        </section>
      )}

      <ConfirmDialog
        open={confirmDiscard}
        title={t("studio_discard_title")}
        message={t("studio_discard_message")}
        confirmLabel={t("studio_discard_ok")}
        cancelLabel={t("studio_keep_editing")}
        onCancel={() => setConfirmDiscard(false)}
        onConfirm={() => {
          setConfirmDiscard(false);
          setEditing(null);
        }}
      />
      <ConfirmDialog
        open={!!pendingDelete}
        title={t("studio_delete_product")}
        message={t("studio_delete_product_confirm", { name: pendingDelete?.product.name ?? "" })}
        confirmLabel={t("studio_delete_permanently")}
        busy={deleting}
        onCancel={() => {
          if (!deleting) setPendingDelete(null);
        }}
        onConfirm={async () => {
          if (!pendingDelete || deleting) return;
          setDeleting(true);
          try {
            await merchantDeleteOffer(pendingDelete.id);
            await qc.invalidateQueries({ queryKey: ["my-store-offers", store.data?.id] });
            showSuccess(t("studio_product_deleted"));
            setPendingDelete(null);
          } catch (error) {
            showError(error);
          } finally {
            setDeleting(false);
          }
        }}
      />

      <ConfirmDialog
        open={!!pendingHistoryDelete}
        title={
          pendingHistoryDelete?.kind === "reservation"
            ? t("studio_delete_reservation")
            : t("studio_delete_order")
        }
        message={
          pendingHistoryDelete?.kind === "reservation"
            ? t("studio_delete_reservation_confirm")
            : t("studio_delete_order_confirm")
        }
        confirmLabel={t("studio_delete_confirm")}
        busy={deletingHistory}
        onCancel={() => {
          if (!deletingHistory) setPendingHistoryDelete(null);
        }}
        onConfirm={async () => {
          if (!pendingHistoryDelete || !store.data || deletingHistory) return;
          setDeletingHistory(true);
          try {
            if (pendingHistoryDelete.kind === "reservation") {
              await merchantArchiveReservation(pendingHistoryDelete.id);
              await qc.invalidateQueries({
                queryKey: ["store-reservations", store.data.id],
              });
            } else {
              await merchantArchiveOrderItems(pendingHistoryDelete.id, store.data.id);
              await qc.invalidateQueries({ queryKey: ["store-orders", store.data.id] });
            }
            showSuccess(
              pendingHistoryDelete.kind === "reservation"
                ? t("studio_reservation_deleted")
                : t("studio_order_deleted"),
            );
            setPendingHistoryDelete(null);
          } catch (error) {
            showError(error);
          } finally {
            setDeletingHistory(false);
          }
        }}
      />

      {mode === "orders" && (
        <section className="space-y-4">
          <div className="rounded-[var(--radius-card)] border border-border bg-card p-4">
            <h2 className="mb-3 font-bold">{t("studio_reservations")}</h2>
            <div className="space-y-2">
              {reservations.data?.map((r) => (
                <div key={r.id} className="rounded-[var(--radius-card)] bg-background p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-mono text-sm font-bold text-accent-ink">{r.code}</p>
                      <p className="text-xs text-muted-foreground">
                        {t("studio_product_units", { name: r.offer?.product?.name ?? t("studio_deleted_product_label"), count: r.quantity })}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "rounded-full px-2 py-1 text-caption font-bold",
                        isActiveReservation(r)
                          ? "bg-warning-soft text-warning"
                          : r.status === "collected"
                            ? "bg-success-soft text-success"
                            : "bg-muted text-muted-foreground",
                      )}
                    >
                      {isActiveReservation(r)
                        ? t("studio_reservation_pending")
                        : r.status === "collected"
                          ? t("studio_reservation_collected")
                          : r.status === "cancelled"
                            ? t("studio_reservation_cancelled")
                            : t("studio_reservation_expired")}
                    </span>
                  </div>
                  {isActiveReservation(r) && (
                    <button
                      onClick={async () => {
                        try {
                          await merchantConfirmReservation(r.code);
                          showSuccess(t("studio_reservation_received"));
                          await qc.invalidateQueries({
                            queryKey: ["store-reservations", store.data?.id],
                          });
                        } catch (error) {
                          showError(error);
                        }
                      }}
                      className="mt-2 w-full rounded-[var(--radius-control)] bg-success-soft py-2 text-xs font-bold text-success transition hover:bg-success/25"
                    >
                      {t("studio_confirm_pickup")}
                    </button>
                  )}
                  {!isActiveReservation(r) && (
                    <button
                      type="button"
                      onClick={() => setPendingHistoryDelete({ kind: "reservation", id: r.id })}
                      className="mt-2 inline-flex min-h-[var(--control-height-compact)] w-full items-center justify-center gap-2 rounded-[var(--radius-control)] border border-danger/20 bg-danger-soft px-3 py-2 text-xs font-bold text-danger transition hover:bg-danger/15"
                    >
                      <Trash2 className="size-3.5" /> {t("studio_delete_history")}
                    </button>
                  )}
                </div>
              ))}
              {!reservations.data?.length && (
                <p className="text-sm text-muted-foreground">{t("studio_no_reservations")}</p>
              )}
            </div>
          </div>

          <div className="rounded-[var(--radius-card)] border border-border bg-card p-4">
            <h2 className="mb-3 font-bold">{t("studio_delivery_orders")}</h2>
            <div className="space-y-2">
              {orders.data?.map((item) => (
                <div key={item.id} className="rounded-[var(--radius-card)] bg-background p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-bold">{item.order.full_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.order.commune} ·{" "}
                        {item.order.delivery_type === "home"
                          ? t("studio_delivery_home")
                          : t("studio_delivery_store")}
                      </p>
                      <p className="mt-0.5 text-xs font-semibold text-foreground">
                        {item.product_name}
                        {item.quantity > 1 ? ` × ${item.quantity}` : ""}
                      </p>
                    </div>
                    <OrderStatusBadge status={item.merchant_order.status} />
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {(item.merchant_order.status === "pending" ||
                      item.merchant_order.status === "confirmed") && (
                      <Link
                        to="/studio/orders/$orderId"
                        params={{ orderId: item.order.id }}
                        className="inline-flex min-h-[var(--control-height-compact)] items-center justify-center rounded-[var(--radius-control)] bg-primary px-4 py-2 text-xs font-bold text-primary-foreground"
                      >
                        {t("studio_order_details")}
                      </Link>
                    )}
                    {item.merchant_order.status === "quoted" && (
                      <p className="w-full rounded-[var(--radius-control)] bg-warning-soft p-2 text-xs leading-relaxed text-warning">
                        {t("studio_quote_pending_customer")}
                      </p>
                    )}

                  </div>
                  {item.merchant_order.status === "delivered" && (
                    <button
                      type="button"
                      onClick={() => setPendingHistoryDelete({ kind: "order", id: item.order.id })}
                      className="mt-2 inline-flex min-h-[var(--control-height-compact)] w-full items-center justify-center gap-2 rounded-[var(--radius-control)] border border-danger/20 bg-danger-soft px-3 py-2 text-xs font-bold text-danger transition hover:bg-danger/15"
                    >
                      <Trash2 className="size-3.5" /> {t("studio_delete_history")}
                    </button>
                  )}
                </div>
              ))}
              {!orders.data?.length && (
                <p className="text-sm text-muted-foreground">{t("studio_no_orders")}</p>
              )}
            </div>
          </div>
        </section>
      )}
    </AppShell>
  );
}

function isActiveReservation(reservation: { status: string; expires_at: string }) {
  const isPending = reservation.status === "pending";
  const hasNotExpired = Date.parse(reservation.expires_at) > Date.now();
  return isPending && hasNotExpired;
}

function AuthGate({ onLogin }: { onLogin: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="space-y-4 px-4 pt-20 text-center">
      <Store className="mx-auto size-12 text-accent-ink" />
      <h1 className="text-2xl font-bold">{t("studio_merchant_dashboard")}</h1>
      <p className="text-sm text-muted-foreground">{t("studio_login_inventory")}</p>
      <button
        onClick={onLogin}
        className="rounded-[var(--radius-card)] bg-primary px-8 py-3 font-bold text-primary-foreground"
      >
        {t("studio_auth_login")}
      </button>
    </div>
  );
}

const CATEGORY_FIELD_CLS =
  "h-[var(--control-height-compact)] w-full rounded-[var(--radius-control)] border border-input bg-background px-3 outline-none transition focus:ring-2 focus:ring-primary/30";

/**
 * منتقي تصنيف ثنائي المستوى: تصنيف رئيسي (أو تصنيف من «تصنيفات أخرى») ثم الفئة الفرعية.
 * ما يُخزَّن في `products.category` هو الفئة الفرعية، أو التصنيف الرئيسي إن لم تكن له فرعيات.
 */
function CategorySelect({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const { t } = useTranslation();
  const resolved = resolveCategoryId(value);
  const main = parentOf(resolved)?.id ?? MAIN_CATEGORIES[0]!.id;
  const subs = childrenOf(main);
  const subValue = subs.some((c) => c.id === resolved) ? resolved : (subs[0]?.id ?? main);

  return (
    <div className="space-y-1.5">
      <div className="grid min-w-0 grid-cols-2 gap-2">
        <select
          value={main}
          aria-label={t("studio_main_category_aria")}
          onChange={(e) => {
            const next = e.target.value;
            onChange(childrenOf(next)[0]?.id ?? next);
          }}
          className={CATEGORY_FIELD_CLS}
        >
          {MAIN_CATEGORIES.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
          <optgroup label={t("studio_other_categories")}>
            {OTHER_CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </optgroup>
        </select>
        <select
          value={subValue}
          aria-label={t("studio_subcategory_aria")}
          onChange={(e) => onChange(e.target.value)}
          className={CATEGORY_FIELD_CLS}
        >
          {subs.length === 0 ? (
            <option value={main}>{t("studio_no_subcategories")}</option>
          ) : (
            subs.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))
          )}
        </select>
      </div>
      <p className="text-caption text-muted-foreground">{t("studio_product_category_note")}</p>
    </div>
  );
}
