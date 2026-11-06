import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import {
  BadgeCheck,
  Camera,
  CalendarDays,
  Heart,
  MapPin,
  Package,
  Pencil,
  Phone,
  User,
  Wallet,
  Settings,
  ShoppingBag,
} from "lucide-react";
import { toast } from "sonner";
import { showError, showSuccess } from "@/lib/feedback";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useFavorites } from "@/lib/favorites";
import {
  fetchMyOrders,
  fetchMyReservations,
  fetchMyProfile,
  fetchPublicProfile,
  fetchMyAccountType,
  fetchMyRoles,
  fetchSchemaSupport,
  isValidDzPhone,
  normalizePhone,
  updateMyProfile,
  uploadImageToBucket,
} from "@/lib/sooqy";
import { WilayaSelect, wilayasQuery } from "@/components/sooqy/WilayaSelect";
import { PageHeader } from "@/components/sooqy/page-header";
import { SectionTitle } from "@/components/sooqy/list-menu";
import { AppShell } from "@/components/sooqy/app-shell";
import { SideSheet } from "@/components/sooqy/side-sheet";
import { ReportContentButton } from "@/components/moderation/ReportContentButton";
import { SeoHead } from "@/components/seo/SeoHead";
import { ErrorState } from "@/components/sooqy/error-state";
import { useTranslation } from "@/lib/i18n";

export const Route = createFileRoute("/profile")({
  validateSearch: (s: Record<string, unknown>): { setup?: boolean; public_id?: string } => ({
    setup: s["setup"] === "1" || s["setup"] === true || s["setup"] === "true",
    public_id: typeof s["public_id"] === "string" ? s["public_id"] : undefined,
  }),
  head: () => ({}),
  component: ProfilePage,
});

function ProfilePage() {
  const { user, ready } = useAuth();
  const { t } = useTranslation();
  const { setup, public_id } = Route.useSearch();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const profile = useQuery({
    queryKey: ["my-profile"],
    queryFn: fetchMyProfile,
    enabled: !!user && !public_id,
  });
  const publicProfile = useQuery({
    queryKey: ["public-profile", public_id],
    queryFn: () => fetchPublicProfile(public_id!),
    enabled: !!public_id,
  });
  const orders = useQuery({
    queryKey: ["my-orders"],
    queryFn: fetchMyOrders,
    enabled: !!user && !public_id,
  });
  const reservations = useQuery({
    queryKey: ["my-reservations"],
    queryFn: fetchMyReservations,
    enabled: !!user && !public_id,
  });
  const roleQuery = useQuery({
    queryKey: ["my-role", user?.id],
    queryFn: fetchMyRoles,
    enabled: !!user && !public_id,
  });
  const accountTypeQuery = useQuery({
    queryKey: ["my-account-type", user?.id],
    queryFn: fetchMyAccountType,
    enabled: !!user && !public_id,
  });
  const isMerchant = accountTypeQuery.data === "merchant" && (roleQuery.data?.includes("merchant") ?? false);
  const wilayas = useQuery(wilayasQuery);
  const favorites = useFavorites();

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [wilayaId, setWilayaId] = useState<number | null>(null);
  const [commune, setCommune] = useState("");
  const [avatar, setAvatar] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const displayName = public_id
    ? (publicProfile.data?.full_name ?? t("profile_default_name"))
    : (profile.data?.full_name ??
      (typeof user?.user_metadata?.["full_name"] === "string"
        ? user.user_metadata["full_name"]
        : null) ??
      user?.email ??
      t("profile_default_name"));
  const initial = displayName.trim().charAt(0) || "A";
  const favCount = favorites.products.length + favorites.stores.length;

  useEffect(() => {
    if (!profile.data || public_id) return;
    setFullName(profile.data.full_name ?? "");
    setPhone(profile.data.phone ?? "");
    setWilayaId(profile.data.wilaya_id ?? null);
    setCommune(profile.data.commune ?? "");
    setAvatarPreview(profile.data.avatar_url ?? null);
  }, [profile.data, public_id]);

  // لا تعرض بيانات الحساب ولا تسمح بتحميلها قبل اكتمال التحقق من الجلسة.
  if (!ready) return null;
  if (!user && !public_id) {
    return (
      <AppShell className="flex min-h-[70vh] flex-col items-center justify-center gap-4 px-6 text-center">
        <span className="flex size-20 items-center justify-center rounded-[var(--radius-card)] bg-primary-soft">
          <User className="size-9 text-accent-ink" strokeWidth={1.6} />
        </span>
        <h1 className="text-h1 text-foreground">{t("profile_login_title")}</h1>
        <p className="max-w-xs text-sm leading-7 text-muted-foreground">
          {t("profile_login_hint")}
        </p>
        <Link to="/auth" search={{ redirect: "/profile" }} className="btn-primary mt-2">
          {t("profile_login_action")}
        </Link>
      </AppShell>
    );
  }
  const save = async () => {
    const cleanName = fullName.trim();
    if (!cleanName) {
      toast.error(t("profile_name_required"));
      return;
    }
    const p = normalizePhone(phone.trim());
    if (p && !isValidDzPhone(p)) {
      toast.error(t("profile_phone_invalid"));
      return;
    }
    setBusy(true);
    try {
      let avatarUrl: string | null | undefined = undefined;
      let avatarSkipped = false;
      if (avatar) {
        avatarUrl = await uploadImageToBucket(avatar, "store-media");
        // القاعدة غير مهاجَرة (عمود avatar_url مفقود) — لا تخزين صامت بلا نتيجة
        const support = await fetchSchemaSupport();
        avatarSkipped = !support.avatar;
      }
      await updateMyProfile({
        full_name: cleanName,
        phone: p,
        wilaya_id: wilayaId,
        commune: commune.trim(),
        ...(avatarUrl !== undefined ? { avatar_url: avatarUrl } : {}),
      });
      // مزامنة الاسم مع auth metadata ليظهر في حسابي فورًا
      await supabase.auth.updateUser({ data: { full_name: cleanName } });
      await qc.invalidateQueries({ queryKey: ["my-profile"] });
      if (avatarSkipped) {
        toast.warning(t("profile_saved_schema_warning"));
      } else {
        showSuccess(t("profile_saved"));
      }
      setEditing(false);
      if (setup) {
        navigate({ to: "/", replace: true });
      } else {
        navigate({ to: "/settings" });
      }
    } catch (e) {
      showError(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <SeoHead
        title={t("profile_seo_title")}
        description={t("profile_seo_description")}
        keywords={t("profile_seo_keywords")}
        ogType="website"
      />
      <AppShell className="mx-auto max-w-xl space-y-5 pb-24 pt-6">
        {isMerchant ? (
          <div className="flex min-h-11 items-center justify-end gap-2">
            <Link to="/bag" aria-label={t("profile_bag_aria")} title={t("profile_bag_aria")} className="inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-border bg-card text-foreground transition hover:bg-muted active:scale-95">
              <ShoppingBag className="size-5" />
            </Link>
            <Link to="/settings" aria-label={t("profile_settings_aria")} title={t("profile_settings_aria")} className="inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-border bg-card text-foreground transition hover:bg-muted active:scale-95">
              <Settings className="size-5" />
            </Link>
          </div>
        ) : (
          <PageHeader title={t("profile_hub_title")} subtitle={t("profile_hub_subtitle")} action={
            <Link to="/settings" aria-label={t("profile_settings_aria")} title={t("profile_settings_aria")} className="inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-border bg-card text-foreground transition hover:bg-muted active:scale-95">
              <Settings className="size-5" />
            </Link>
          } />
        )}
        {profile.isError && (
          <ErrorState scope="profile" error={profile.error} onRetry={() => profile.refetch()} />
        )}

        {/* بطاقة الهوية: غلاف + صورة متداخلة + بيانات + إحصاءات سريعة */}
        <section className="overflow-hidden rounded-[var(--radius-card)] border border-border bg-card ">
          <div className="h-20 bg-gradient-to-br from-primary via-primary/70 to-primary-soft" />
          <div className="px-5 pb-5">
            <div className="-mt-10 flex items-end justify-between gap-3">
              <div className="relative shrink-0">
                <div className="flex size-20 items-center justify-center overflow-hidden rounded-full bg-primary-soft ring-4 ring-card">
                  {avatarPreview ? (
                    <img
                      src={avatarPreview}
                      alt={t("profile_avatar_alt")}
                      loading="lazy"
                      decoding="async"
                      className="size-full rounded-full object-cover"
                    />
                  ) : (
                    <span className="text-3xl font-extrabold text-accent-ink">
                      {(displayName || initial).trim()[0]}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  className="absolute -bottom-1 -end-1 flex size-8 items-center justify-center rounded-full bg-primary text-accent-ink-foreground ring-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-card transition active:scale-95"
                  aria-label={t("profile_change_avatar")}
                >
                  <Camera className="size-4" />
                </button>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/avif,image/gif,image/heic,image/heif"
                  onChange={(e) => {
                    const f = e.target.files?.[0] ?? null;
                    setAvatar(f);
                    setAvatarPreview((old) => {
                      if (old?.startsWith("blob:")) URL.revokeObjectURL(old);
                      return f ? URL.createObjectURL(f) : (profile.data?.avatar_url ?? null);
                    });
                  }}
                  className="hidden"
                />
              </div>
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="flex min-h-11 shrink-0 items-center gap-1.5 rounded-full bg-primary px-5 text-sm font-bold text-accent-ink-foreground transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <Pencil className="size-4" /> {t("profile_edit_button")}
              </button>
            </div>

            <div className="mt-3 min-w-0">
              <h2 className="truncate text-xl font-extrabold text-foreground">{displayName}</h2>
              {!public_id && (
                <p className="truncate text-sm text-muted-foreground">{user?.email ?? ""}</p>
              )}
              {public_id && user?.id !== public_id && (
                <div className="mt-2">
                  <ReportContentButton
                    targetType="user"
                    targetId={public_id}
                    label={t("profile_report_action")}
                  />
                </div>
              )}
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              {profile.data?.phone && (
                <span className="flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs font-semibold text-foreground">
                  <Phone className="size-3.5 text-muted-foreground" />
                  <span dir="ltr">{profile.data.phone}</span>
                </span>
              )}
              {(profile.data?.commune || profile.data?.wilaya_id != null) && (
                <span className="flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs font-semibold text-foreground">
                  <MapPin className="size-3.5 text-muted-foreground" />
                  <span className="truncate">
                    {profile.data.commune ?? ""}
                    {profile.data.commune && profile.data.wilaya_id != null
                      ? t("profile_location_separator")
                      : ""}
                    {wilayas.data?.find((w) => w.id === profile.data?.wilaya_id)?.name_ar ??
                      (profile.data.wilaya_id != null
                        ? String(profile.data.wilaya_id).padStart(2, "0")
                        : "")}
                  </span>
                </span>
              )}
              {profile.data?.is_phone_verified && (
                <span className="flex items-center gap-1.5 rounded-full bg-success-soft px-3 py-1 text-xs font-bold text-success">
                  <BadgeCheck className="size-3.5" /> {t("profile_phone_verified")}
                </span>
              )}
            </div>
          </div>
        </section>

        {/* نشاط الحساب — وصول مباشر إلى أهم الوجهات */}
        <section className="space-y-2" aria-label={t("profile_activity")}>
          <SectionTitle>{t("profile_activity")}</SectionTitle>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              {
                to: "/orders",
                Icon: Package,
                label: t("profile_orders"),
                value: orders.data?.length ?? 0,
              },
              {
                to: "/reservations",
                Icon: CalendarDays,
                label: t("profile_reservations"),
                value: reservations.data?.length ?? 0,
              },
              { to: "/favorites", Icon: Heart, label: t("profile_favorites"), value: favCount },
              { to: "/wallet", Icon: Wallet, label: t("profile_wallet"), value: null },
            ].map(({ to, Icon, label, value }) => (
              <Link
                key={to}
                to={to}
                className="card-premium flex min-h-24 flex-col items-center justify-center gap-1 p-3 text-center"
              >
                <span className="flex size-9 items-center justify-center rounded-[var(--radius-control)] bg-primary-soft text-accent-ink">
                  <Icon className="size-4.5" aria-hidden="true" />
                </span>
                <span className="text-xs font-bold text-foreground">{label}</span>
                {value !== null && (
                  <span className="text-lg font-extrabold leading-none text-foreground">
                    {to === "/orders"
                      ? orders.isLoading
                        ? "…"
                        : orders.isError
                          ? "—"
                          : value
                      : value}
                  </span>
                )}
              </Link>
            ))}
          </div>
        </section>

        <div className="pt-1">
          <p className="pt-3 text-center text-xs text-muted-foreground">
            Arownd · {t("profile_beta_footer")}
          </p>
        </div>

        {/* نموذج تعديل الملف — لوحة جانبية بدل نموذج في أسفل الصفحة */}
        <SideSheet
          open={editing}
          onOpenChange={setEditing}
          title={t("profile_edit_title")}
          description={t("profile_edit_description")}
          footer={
            <button
              type="button"
              onClick={save}
              disabled={busy}
              className="btn-primary w-full py-3 disabled:opacity-50"
            >
              {busy ? t("profile_saving") : t("profile_save_changes")}
            </button>
          }
        >
          <div className="space-y-4">
            <div>
              <label
                htmlFor="profile-full-name"
                className="mb-1 block text-xs font-bold text-muted-foreground"
              >
                {t("profile_full_name_label")} *
              </label>
              <input
                id="profile-full-name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder={t("profile_full_name_placeholder")}
                autoComplete="name"
                className="h-[var(--control-height)] w-full rounded-[var(--radius-control)] border border-input bg-background px-3 outline-none transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
              />
            </div>
            <div>
              <label
                htmlFor="profile-phone"
                className="mb-1 block text-xs font-bold text-muted-foreground"
              >
                {t("profile_phone_label")}
              </label>
              <input
                id="profile-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="05XX XX XX XX"
                inputMode="tel"
                autoComplete="tel"
                dir="ltr"
                className="h-[var(--control-height)] w-full rounded-[var(--radius-control)] border border-input bg-background px-3 text-start outline-none transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="mb-1 block text-xs font-bold text-muted-foreground">
                  {t("profile_wilaya_label")}
                </span>
                <WilayaSelect
                  value={wilayaId}
                  onChange={setWilayaId}
                  allLabel={null}
                  required
                  className="h-12"
                />
              </div>
              <div>
                <label
                  htmlFor="profile-commune"
                  className="mb-1 block text-xs font-bold text-muted-foreground"
                >
                  {t("profile_commune_label")}
                </label>
                <input
                  id="profile-commune"
                  value={commune}
                  onChange={(e) => setCommune(e.target.value)}
                  placeholder={t("profile_commune_placeholder")}
                  autoComplete="address-level2"
                  className="h-[var(--control-height)] w-full rounded-[var(--radius-control)] border border-input bg-background px-3 outline-none transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                />
              </div>
            </div>
          </div>
        </SideSheet>
      </AppShell>
    </>
  );
}
