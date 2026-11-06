import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, PackagePlus } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { translate, useTranslation } from "@/lib/i18n";
import { showError, showSuccess } from "@/lib/feedback";
import {
  fetchMyStore,
  fetchMyRoles,
  fetchMyAccountType,
  merchantQuickAddProduct,
} from "@/lib/sooqy";
import { DashboardLoadingSkeleton } from "@/components/sooqy/skeleton";
import { ErrorState } from "@/components/sooqy/error-state";
import { PageHeader } from "@/components/sooqy/page-header";
import { AppShell } from "@/components/sooqy/app-shell";
import { ImageUploader } from "@/components/sooqy/image-uploader";
import {
  DEFAULT_CATEGORY_ID,
  MAIN_CATEGORIES,
  OTHER_CATEGORIES,
  childrenOf,
  parentOf,
  resolveCategoryId,
} from "@/lib/taxonomy";
import { useRealtimeSubscription } from "@/hooks/use-realtime";

export const Route = createFileRoute("/studio/add-product")({
  head: () => ({ meta: [{ title: translate("studio_add_product_meta_title") }] }),
  component: AddProductPage,
});

const FIELD = "h-[var(--control-height)] w-full min-w-0 rounded-[var(--radius-control)] border border-input bg-background px-4 outline-none transition focus:border-accent-ink focus:ring-2 focus:ring-primary/20";
const COMPACT_FIELD = "h-[var(--control-height-compact)] w-full min-w-0 rounded-[var(--radius-control)] border border-input bg-background px-3 outline-none transition focus:ring-2 focus:ring-primary/30";

function CategoryPicker({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const { t } = useTranslation();
  const resolved = resolveCategoryId(value);
  const main = parentOf(resolved)?.id ?? MAIN_CATEGORIES[0]!.id;
  const subs = childrenOf(main);
  const subValue = subs.some((item) => item.id === resolved) ? resolved : (subs[0]?.id ?? main);
  return (
    <div className="space-y-1.5">
      <div className="grid min-w-0 grid-cols-2 gap-2">
        <select value={main} aria-label={t("studio_main_category_aria")} onChange={(e) => onChange(childrenOf(e.target.value)[0]?.id ?? e.target.value)} className={COMPACT_FIELD}>
          {MAIN_CATEGORIES.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
          <optgroup label={t("studio_other_categories")}>
            {OTHER_CATEGORIES.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
          </optgroup>
        </select>
        <select value={subValue} aria-label={t("studio_subcategory_aria")} onChange={(e) => onChange(e.target.value)} className={COMPACT_FIELD}>
          {subs.length === 0 ? <option value={main}>{t("studio_no_subcategories")}</option> : subs.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
        </select>
      </div>
      <p className="text-caption text-muted-foreground">{t("studio_product_category_note")}</p>
    </div>
  );
}

function AddProductPage() {
  const { user, ready } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { t } = useTranslation();
  const [form, setForm] = useState({ name: "", price: "", stock: "", category: DEFAULT_CATEGORY_ID, brand: "", description: "", sizes: "", colors: "" });
  const [images, setImages] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const roles = useQuery({ queryKey: ["my-roles"], queryFn: fetchMyRoles, enabled: !!user });
  const accountType = useQuery({ queryKey: ["my-account-type", user?.id], queryFn: fetchMyAccountType, enabled: !!user });
  const store = useQuery({ queryKey: ["my-store"], queryFn: fetchMyStore, enabled: !!user });
  useRealtimeSubscription({ table: "store_offers", filter: store.data?.id ? `store_id=eq.${store.data.id}` : undefined, queryKeys: [["my-store-offers", store.data?.id ?? ""]], enabled: !!store.data?.id });

  if (!ready) return null;
  if (!user) return <div className="mx-auto max-w-xl space-y-4 px-4 pt-6"><PageHeader title={t("studio_add_product_title")} back="/studio" /><div className="rounded-[var(--radius-card)] border border-border bg-card p-5 text-center"><p className="text-sm text-muted-foreground">{t("studio_add_product_login_hint")}</p><Link to="/auth" search={{ redirect: "/studio/add-product" }} className="btn-primary mt-4 inline-flex px-5 py-3">{t("studio_login_action")}</Link></div></div>;
  if (store.isLoading || roles.isLoading || accountType.isLoading) return <DashboardLoadingSkeleton cards={2} />;
  if (store.isError || roles.isError || accountType.isError) return <div className="mx-auto max-w-xl px-4 pt-6"><ErrorState scope="studio:add-product" error={store.error ?? roles.error ?? accountType.error} onRetry={() => { void store.refetch(); void roles.refetch(); void accountType.refetch(); }} /></div>;
  if (accountType.data !== "merchant" || !roles.data?.includes("merchant")) return <div className="mx-auto max-w-xl px-4 pt-6"><PageHeader title={t("studio_add_product_title")} back="/studio" /><p className="rounded-[var(--radius-card)] border border-border bg-card p-4 text-sm text-muted-foreground">{t("studio_merchant_only_hint")}</p></div>;
  if (!store.data) return <div className="mx-auto max-w-xl space-y-4 px-4 pt-6"><PageHeader title={t("studio_add_product_title")} back="/studio" /><p className="rounded-[var(--radius-card)] border border-border bg-card p-4 text-sm text-muted-foreground">{t("studio_create_store_before_products")}</p></div>;
  const storeId = store.data.id;

  const update = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));
  const save = async () => {
    const name = form.name.trim();
    const price = Number(form.price);
    const stock = Number(form.stock);
    if (
      !name ||
      !form.price.trim() ||
      !Number.isFinite(price) ||
      price <= 0 ||
      form.stock === "" ||
      !Number.isInteger(stock) ||
      stock < 0 ||
      stock > 9999
    ) {
      toast.error(t("studio_product_required_fields"));
      return;
    }
    setBusy(true);
    try {
      const sizes = form.sizes.split(/[،,]/).map((v) => v.trim()).filter(Boolean);
      const colors = form.colors.split(/[،,]/).map((v) => v.trim()).filter(Boolean);
      await merchantQuickAddProduct({
        storeId,
        name,
        price,
        stock,
        category: form.category,
        ...(form.brand.trim() ? { brand: form.brand.trim() } : {}),
        ...(form.description.trim() ? { description: form.description.trim() } : {}),
        ...(sizes.length ? { sizes } : {}),
        ...(colors.length ? { colors } : {}),
      }, images.length ? images : null);
      showSuccess(t("studio_product_added"));
      await qc.invalidateQueries({ queryKey: ["my-store-offers", storeId] });
      await qc.invalidateQueries({ queryKey: ["near-stores"] });
      setForm({ name: "", price: "", stock: "", category: DEFAULT_CATEGORY_ID, brand: "", description: "", sizes: "", colors: "" });
      setImages([]);
      navigate({ to: "/studio" });
    } catch (error) {
      showError(error);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppShell className="mx-auto max-w-2xl space-y-4 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-3">
      <PageHeader title={t("studio_add_product_title")} subtitle={t("studio_add_product_subtitle")} back="/studio" />
      <section className="rounded-[var(--radius-card)] border border-border bg-card p-3.5 sm:p-6">
        <div className="mb-4 flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-[var(--radius-control)] bg-primary-soft text-accent-ink"><PackagePlus className="size-5" /></span>
          <div><h2 className="font-extrabold text-foreground">{t("studio_product_data_heading")}</h2><p className="text-xs text-muted-foreground">{t("studio_product_data_hint")}</p></div>
        </div>
        <div className="grid min-w-0 gap-3">
          <label className="grid gap-1.5 text-sm font-semibold">{t("studio_product_name_label")}<input value={form.name} onChange={(e) => update("name", e.target.value)} placeholder={t("studio_product_name_ph")} className={FIELD} /></label>
          <div className="grid grid-cols-2 gap-2">
            <label className="grid gap-1.5 text-sm font-semibold">{t("studio_product_price_label")}<input value={form.price} onChange={(e) => update("price", e.target.value)} placeholder={t("studio_price_dzd_ph")} type="number" min="0" className={FIELD} /></label>
            <label className="grid gap-1.5 text-sm font-semibold">{t("studio_product_quantity_label")}<input value={form.stock} onChange={(e) => update("stock", e.target.value)} placeholder={t("studio_quantity_ph")} type="number" min="0" className={FIELD} /></label>
          </div>
          <CategoryPicker value={form.category} onChange={(value) => update("category", value)} />
          <label className="grid gap-1.5 text-sm font-semibold">{t("studio_product_brand_label")}<input value={form.brand} onChange={(e) => update("brand", e.target.value)} placeholder={t("studio_brand_ph")} className={COMPACT_FIELD} /></label>
          <label className="grid gap-1.5 text-sm font-semibold">{t("studio_product_sizes_label")}<input value={form.sizes} onChange={(e) => update("sizes", e.target.value)} placeholder={t("studio_sizes_ph")} className={COMPACT_FIELD} /></label>
          <label className="grid gap-1.5 text-sm font-semibold">{t("studio_product_colors_label")}<input value={form.colors} onChange={(e) => update("colors", e.target.value)} placeholder={t("studio_colors_ph")} className={COMPACT_FIELD} /></label>
          <label className="grid gap-1.5 text-sm font-semibold">{t("studio_product_description_label")}<textarea value={form.description} onChange={(e) => update("description", e.target.value)} placeholder={t("studio_description_ph")} rows={4} className="min-h-24 w-full rounded-[var(--radius-control)] border border-input bg-background px-4 py-3 font-normal outline-none focus:border-accent-ink focus:ring-2 focus:ring-primary/20" /></label>
          <div className="grid gap-1.5 text-sm font-semibold"><span>{t("studio_product_images_label")}</span><ImageUploader initialItems={[]} onChange={(items) => setImages(items.map((item) => item.file).filter(Boolean))} label={t("studio_add_product_images_label")} /></div>
          <button type="button" onClick={save} disabled={busy} className="mt-2 min-h-12 rounded-2xl bg-primary px-5 py-3 font-extrabold text-primary-foreground transition active:scale-[var(--scale-pressed)] disabled:opacity-50">{busy ? t("studio_saving") : t("studio_save_product")}</button>
        </div>
      </section>
    </AppShell>
  );
}
