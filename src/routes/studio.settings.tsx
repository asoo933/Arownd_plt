import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Camera, MapPin, Save, Store } from "lucide-react";
import { toast } from "sonner";
import { showError, showSuccess } from "@/lib/feedback";
import { useAuth } from "@/lib/auth";
import { translate, useTranslation } from "@/lib/i18n";
import {
  fetchMyAccountType,
  fetchMyRoles,
  fetchMyStore,
  merchantUpdateStore,
  buildStoreMediaPatch,
  uploadImageToBucket,
} from "@/lib/sooqy";
import { childrenOf } from "@/lib/taxonomy";
import { MainCategoryPicker, SubcategoryMultiSelect } from "@/components/sooqy/category-tiles";
import { geoErrorMessage, useGeo } from "@/lib/geo";
import { WilayaSelect } from "@/components/sooqy/WilayaSelect";
import { StoreLocationPicker } from "@/components/sooqy/StoreLocationPicker";
import { PageHeader } from "@/components/sooqy/page-header";
import { AppShell } from "@/components/sooqy/app-shell";
import { ErrorState } from "@/components/sooqy/error-state";
import { cn } from "@/lib/utils";
import { StoreSettingsSkeleton } from "@/components/sooqy/skeleton";

export const Route = createFileRoute("/studio/settings")({
  head: () => ({
    meta: [
      { title: translate("studio_settings_meta_title") },
      { name: "description", content: translate("studio_settings_meta_description") },
    ],
  }),
  component: StoreSettingsPage,
});

function StoreSettingsPage() {
  const { t } = useTranslation();
  const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"].map(
    (day) => t(`studio_day_${day}`),
  );
  const { user, ready } = useAuth();
  const qc = useQueryClient();
  const { ask, locating } = useGeo();
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
  const store = useQuery({ queryKey: ["my-store"], queryFn: fetchMyStore, enabled: !!user });

  const locate = async () => {
    const { pos: found, reason: why } = await ask();
    if (!found) {
      toast.error(geoErrorMessage(why));
      return;
    }
    setForm((f) => ({ ...f, latitude: found.lat, longitude: found.lng }));
    showSuccess(t("studio_store_location_found"));
  };

  const [form, setForm] = useState({
    name: "",
    description: "",
    phone: "",
    whatsapp: "",
    wilaya_id: null as number | null,
    commune: "",
    address_line: "",
    open: "09:00",
    close: "18:00",
    instagram: "",
    facebook: "",
    latitude: null as number | null,
    longitude: null as number | null,
    category: null as string | null,
    subcategories: [] as string[],
  });
  const [closedDays, setClosedDays] = useState<number[]>([]);
  const [logo, setLogo] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [cover, setCover] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!logoPreview?.startsWith("blob:")) return;
    return () => URL.revokeObjectURL(logoPreview);
  }, [logoPreview]);

  useEffect(() => {
    if (!coverPreview?.startsWith("blob:")) return;
    return () => URL.revokeObjectURL(coverPreview);
  }, [coverPreview]);

  // تعبئة النموذج من بيانات المتجر الحالية — مرة واحدة
  useEffect(() => {
    if (loaded || !store.data) return;
    const s = store.data;
    const oh = (s.opening_hours ?? {}) as { open?: string; close?: string; closed_days?: number[] };
    setForm({
      name: s.name ?? "",
      description: s.description ?? "",
      phone: s.phone ?? "",
      whatsapp: s.whatsapp ?? "",
      wilaya_id: s.wilaya_id,
      commune: s.commune ?? "",
      address_line: s.address_line ?? "",
      open: oh.open ?? "09:00",
      close: oh.close ?? "18:00",
      instagram: s.instagram_url ?? "",
      facebook: s.facebook_url ?? "",
      latitude: s.latitude ?? null,
      longitude: s.longitude ?? null,
      category: s.category ?? null,
      subcategories: (s.subcategories ?? []) as string[],
    });
    setClosedDays(oh.closed_days ?? []);
    setLogoPreview(s.logo_url ?? null);
    setCoverPreview(s.cover_url ?? null);
    setLoaded(true);
  }, [store.data, loaded]);

  if (!ready) return null;
  if (!user)
    return (
      <div className="space-y-4 px-4 pt-20 text-center">
        <Store className="mx-auto size-12 text-accent-ink" />
        <h1 className="text-h1 text-foreground">{t("studio_store_info")}</h1>
        <p className="text-sm text-muted-foreground">{t("studio_login_store_settings")}</p>
        <Link to="/auth" className="btn-primary mx-auto w-fit px-8">
          {t("studio_settings_login_action")}
        </Link>
      </div>
    );
  if (roles.isLoading || accountType.isLoading) {
    return <StoreSettingsSkeleton />;
  }
  if (roles.isError || accountType.isError) {
    return (
      <div className="mx-auto max-w-xl space-y-4 px-4 pt-6">
        <PageHeader title={t("studio_store_info")} back="/profile" />
        <ErrorState
          scope="studio:settings:roles"
          error={roles.error ?? accountType.error}
          onRetry={() => Promise.all([roles.refetch(), accountType.refetch()])}
        />
      </div>
    );
  }
  if (accountType.data !== "merchant" || !roles.data?.includes("merchant")) {
    return (
      <div className="space-y-4 px-4 pt-20 text-center">
        <Store className="mx-auto size-12 text-accent-ink" />
        <h1 className="text-h1 text-foreground">{t("studio_title")}</h1>
        <p className="text-sm text-muted-foreground">{t("studio_login_store_settings")}</p>
        <Link to="/profile" className="btn-primary mx-auto inline-flex px-8">
          {t("profile_hub_title")}
        </Link>
      </div>
    );
  }

  if (store.isLoading) {
    return <StoreSettingsSkeleton />;
  }

  if (store.isError) {
    return (
      <div className="mx-auto max-w-xl space-y-4 px-4 pt-6">
        <PageHeader
          title={t("studio_store_info")}
          subtitle={t("studio_settings_subtitle")}
          back="/studio"
        />
        <ErrorState
          scope="studio:settings:store"
          error={store.error}
          onRetry={() => store.refetch()}
        />
      </div>
    );
  }

  if (!store.data)
    return (
      <div className="space-y-4 px-4 pt-20 text-center">
        <Store className="mx-auto size-12 text-accent-ink" />
        <h1 className="text-h1 text-foreground">{t("studio_no_store_yet")}</h1>
        <p className="text-sm text-muted-foreground">{t("studio_create_store_first")}</p>
        <Link to="/studio" className="btn-primary mx-auto w-fit px-8">
          {t("studio_settings_create_store")}
        </Link>
      </div>
    );

  const pickLogo = (file: File | null) => {
    setLogo(file);
    setLogoPreview(file ? URL.createObjectURL(file) : (store.data?.logo_url ?? null));
  };

  const pickCover = (file: File | null) => {
    setCover(file);
    setCoverPreview(file ? URL.createObjectURL(file) : (store.data?.cover_url ?? null));
  };

  const toggleDay = (i: number) =>
    setClosedDays((prev) => (prev.includes(i) ? prev.filter((d) => d !== i) : [...prev, i].sort()));

  const save = async () => {
    if (!store.data) return;
    if (!form.name.trim() || !form.wilaya_id || !form.commune.trim() || !form.address_line.trim()) {
      toast.error(t("studio_store_required_fields"));
      return;
    }
    setBusy(true);
    try {
      // الإحداثيات تُحفظ فقط إذا اكتمل الزوج (خط عرض + خط طول)
      const hasCoords = form.latitude != null && form.longitude != null;
      const uploadedMedia: { logoUrl?: string; coverUrl?: string } = {};
      if (logo) uploadedMedia.logoUrl = await uploadImageToBucket(logo, "store-media");
      if (cover) uploadedMedia.coverUrl = await uploadImageToBucket(cover, "store-media");
      await merchantUpdateStore(store.data.id, {
        name: form.name.trim(),
        description: form.description.trim() || null,
        phone: form.phone.trim(),
        whatsapp: form.whatsapp.trim(),
        wilaya_id: form.wilaya_id,
        commune: form.commune.trim(),
        address_line: form.address_line.trim(),
        latitude: hasCoords ? form.latitude : null,
        longitude: hasCoords ? form.longitude : null,
        opening_hours: { open: form.open, close: form.close, closed_days: closedDays },
        ...buildStoreMediaPatch(uploadedMedia),
        instagram_url: form.instagram.trim() || null,
        facebook_url: form.facebook.trim() || null,
        category: form.category,
        subcategories: form.subcategories,
      });
      await qc.invalidateQueries({ queryKey: ["my-store"] });
      showSuccess(t("studio_store_settings_saved"));
    } catch (e) {
      showError(e);
    } finally {
      setBusy(false);
    }
  };

  const inputCls =
    "w-full rounded-[var(--radius-control)] border border-input bg-background px-3 py-2.5 outline-none transition focus:ring-2 focus:ring-primary/30 disabled:opacity-50";
  const labelCls = "mb-1 block text-xs font-bold text-muted-foreground";

  return (
    <AppShell className="mx-auto max-w-4xl space-y-4 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-3 lg:space-y-6 lg:pt-8">
      <PageHeader
        title={t("studio_settings_heading")}
        subtitle={t("studio_settings_subtitle")}
      />

      {/* بطاقة الهوية: الغلاف + الشعار + الاسم */}
      <section className="overflow-hidden rounded-[var(--radius-card)] border border-border bg-card ">
        <div className="relative h-32 bg-muted/40 sm:h-40">
          {coverPreview ? (
            <img
              src={coverPreview}
              alt={t("studio_settings_cover_alt")}
              fetchPriority="low"
              decoding="async"
              className="size-full object-cover"
            />
          ) : (
            <div className="flex size-full items-center justify-center bg-primary-soft text-4xl font-extrabold text-accent-ink">
              {form.name.trim() ? form.name.trim()[0] : "؟"}
            </div>
          )}
          <button
            type="button"
            onClick={() => coverInputRef.current?.click()}
            className="absolute bottom-3 end-3 inline-flex min-h-10 items-center gap-2 rounded-full bg-card/95 px-3 text-xs font-bold text-foreground shadow-sm backdrop-blur transition active:scale-95"
            aria-label={t("studio_change_store_cover")}
          >
            <Camera className="size-4" />
            {t("studio_change_store_cover")}
          </button>
        </div>
        <div className="flex items-end gap-3 px-3.5 pb-3.5 sm:px-4 sm:pb-4">
          <button
            type="button"
            onClick={() => logoInputRef.current?.click()}
            className="relative -mt-9 size-20 shrink-0 overflow-hidden rounded-[var(--radius-card)] border-4 border-card bg-primary-soft  transition active:scale-95"
            aria-label={t("studio_change_store_logo")}
          >
            {logoPreview ? (
              <img
                src={logoPreview}
                alt={t("studio_settings_logo_alt")}
                fetchPriority="low"
                decoding="async"
                className="size-full object-cover"
              />
            ) : (
              <span className="flex size-full items-center justify-center text-3xl font-extrabold text-accent-ink">
                {form.name.trim() ? form.name.trim()[0] : "؟"}
              </span>
            )}
            <span className="absolute bottom-1 end-1 flex size-6 items-center justify-center rounded-full bg-primary text-accent-ink-foreground">
              <Camera className="size-3" />
            </span>
          </button>
          <div className="min-w-0 flex-1 pt-1">
            <p className="truncate text-base font-extrabold text-foreground">
              {form.name.trim() || t("studio_settings_name_fallback")}
            </p>
            <p className="text-xs text-muted-foreground">{t("studio_change_logo_cover")}</p>
          </div>
        </div>
        <input
          ref={logoInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif,image/gif,image/heic,image/heif"
          onChange={(e) => pickLogo(e.target.files?.[0] ?? null)}
          className="hidden"
        />
        <input
          ref={coverInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif,image/gif,image/heic,image/heif"
          onChange={(e) => pickCover(e.target.files?.[0] ?? null)}
          className="hidden"
        />
      </section>

      {/* بطاقة: معلومات المتجر */}
      <section className="space-y-3 rounded-[var(--radius-card)] border border-border bg-card p-3.5 sm:p-5">
        <h2 className="text-section text-foreground">{t("studio_store_info")}</h2>
        <div>
          <label className={labelCls}>{t("studio_store_name_required")}</label>
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder={t("studio_store_name_ph")}
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>{t("studio_store_description")}</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder={t("studio_short_store_description_ph")}
            rows={2}
            className={cn(inputCls, "resize-none")}
          />
        </div>
        <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2">
          <div>
            <label className={labelCls}>{t("studio_phone")}</label>
            <input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="05XX XX XX XX"
              inputMode="tel"
              dir="ltr"
              className={cn(inputCls, "text-start")}
            />
          </div>
          <div>
            <label className={labelCls}>{t("studio_whatsapp")}</label>
            <input
              value={form.whatsapp}
              onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
              placeholder="05XX XX XX XX"
              inputMode="tel"
              dir="ltr"
              className={cn(inputCls, "text-start")}
            />
          </div>
        </div>
      </section>

      {/* بطاقة: تصنيف المتجر */}
      <section className="space-y-3 rounded-[var(--radius-card)] border border-border bg-card p-4">
        <div>
          <h2 className="text-section text-foreground">{t("studio_store_category")}</h2>
          <p className="text-xs text-muted-foreground">
            {t("studio_settings_category_hint")}
          </p>
        </div>
        <MainCategoryPicker
          value={form.category}
          onChange={(category) =>
            setForm((f) => ({
              ...f,
              category,
              subcategories: f.subcategories.filter((x) =>
                childrenOf(category).some((c) => c.id === x),
              ),
            }))
          }
        />
        {form.category && (
          <div className="space-y-2">
            <label className={labelCls}>{t("studio_subcategories_optional")}</label>
            <SubcategoryMultiSelect
              categoryId={form.category}
              value={form.subcategories}
              onToggle={(id) =>
                setForm((f) => ({
                  ...f,
                  subcategories: f.subcategories.includes(id)
                    ? f.subcategories.filter((x) => x !== id)
                    : [...f.subcategories, id],
                }))
              }
            />
          </div>
        )}
        {!form.category && (
          <p className="rounded-[var(--radius-control)] bg-warning-soft px-3 py-2 text-caption font-bold text-warning-foreground">
            ⚠️ {t("studio_settings_category_missing")}
          </p>
        )}
      </section>

      {/* بطاقة: الموقع */}
      <section className="space-y-3 rounded-[var(--radius-card)] border border-border bg-card p-4">
        <h2 className="text-sm font-extrabold text-foreground">{t("studio_location")}</h2>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>{t("studio_wilaya_required")}</label>
            <WilayaSelect
              value={form.wilaya_id}
              onChange={(wilaya_id) => setForm({ ...form, wilaya_id })}
              allLabel={t("studio_choose_wilaya")}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>{t("studio_commune_required")}</label>
            <input
              value={form.commune}
              onChange={(e) => setForm({ ...form, commune: e.target.value })}
              placeholder={t("studio_commune_ph")}
              className={inputCls}
            />
          </div>
        </div>
        <div>
          <label className={labelCls}>{t("studio_address_required")}</label>
          <input
            value={form.address_line}
            onChange={(e) => setForm({ ...form, address_line: e.target.value })}
            placeholder={t("studio_detailed_address_ph")}
            className={inputCls}
          />
        </div>
        <StoreLocationPicker
          value={
            form.latitude != null && form.longitude != null
              ? { lat: form.latitude, lng: form.longitude }
              : null
          }
          onChange={({ lat, lng }) =>
            setForm((current) => ({ ...current, latitude: lat, longitude: lng }))
          }
        />
        <button
          type="button"
          onClick={locate}
          disabled={locating}
          className="flex w-full items-center justify-center gap-2 rounded-[var(--radius-control)] bg-primary-soft py-2.5 text-sm font-bold text-accent-ink transition active:scale-[var(--scale-pressed)] disabled:opacity-50"
        >
          <MapPin className="size-4" />
          {locating ? t("studio_locating") : t("studio_locate_on_map")}
        </button>
        {form.latitude != null && form.longitude != null && (
          <p className="text-center text-xs font-bold text-success">
            {t("studio_location_selected")} · {form.latitude.toFixed(5)},{" "}
            {form.longitude.toFixed(5)}
          </p>
        )}
      </section>

      {/* بطاقة: ساعات العمل */}
      <section className="space-y-3 rounded-[var(--radius-card)] border border-border bg-card p-4">
        <h2 className="text-sm font-extrabold text-foreground">{t("studio_working_hours")}</h2>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>{t("studio_start_at")}</label>
            <input
              type="time"
              value={form.open}
              onChange={(e) => setForm({ ...form, open: e.target.value })}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>{t("studio_end_at")}</label>
            <input
              type="time"
              value={form.close}
              onChange={(e) => setForm({ ...form, close: e.target.value })}
              className={inputCls}
            />
          </div>
        </div>
        <div>
          <label className={labelCls}>{t("studio_holidays")}</label>
          <div className="grid grid-cols-4 gap-1.5">
            {days.map((day, i) => (
              <button
                key={day}
                type="button"
                onClick={() => toggleDay(i)}
                className={cn(
                  "rounded-lg px-2 py-2 text-xs font-bold transition active:scale-95",
                  closedDays.includes(i)
                    ? "bg-primary text-accent-ink-foreground"
                    : "bg-muted text-muted-foreground",
                )}
                aria-pressed={closedDays.includes(i)}
              >
                {day}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* بطاقة: التواصل الاجتماعي */}
      <section className="space-y-3 rounded-[var(--radius-card)] border border-border bg-card p-4">
        <h2 className="text-sm font-extrabold text-foreground">{t("studio_social")}</h2>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>{t("studio_instagram")}</label>
            <input
              value={form.instagram}
              onChange={(e) => setForm({ ...form, instagram: e.target.value })}
              placeholder="@username"
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>{t("studio_facebook")}</label>
            <input
              value={form.facebook}
              onChange={(e) => setForm({ ...form, facebook: e.target.value })}
              placeholder={t("studio_facebook_page_ph")}
              className={inputCls}
            />
          </div>
        </div>
      </section>

      {/* زر الحفظ */}
      <button
        onClick={save}
        disabled={busy}
        className="sticky bottom-3 z-20 flex min-h-[var(--control-height)] w-full items-center justify-center gap-2 rounded-[var(--radius-card)] bg-primary py-3 font-extrabold text-primary-foreground  transition active:scale-[var(--scale-pressed)] disabled:opacity-50"
      >
        <Save className="size-4.5" />
        {busy ? t("studio_settings_save_loading") : t("studio_settings_save")}
      </button>
    </AppShell>
  );
}
