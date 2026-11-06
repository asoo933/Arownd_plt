import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import {
  BadgeCheck,
  Bell,
  Camera,
  CalendarDays,
  ChevronLeft,
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
  fetchMyNotifications,
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
import { formatDateTime } from "@/lib/market";
import { useRealtimeSubscription } from "@/hooks/use-realtime";
import { getRecentActivity } from "@/lib/profile-activity";

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
  const notifications = useQuery({
    queryKey: ["notifications"],
    queryFn: fetchMyNotifications,
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
  useRealtimeSubscription({
    table: "notifications",
    filter: user?.id ? `user_id=eq.${user.id}` : undefined,
    queryKeys: [["notifications"]],
    enabled: !!user && !public_id,
  });
  const recentNotifications = getRecentActivity(notifications.data ?? [], 3);

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
      if (setup) navigate({ to: "/", replace: true });
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

        {profile.isLoading && !profile.data && !public_id && (
          <div className="h-28 animate-pulse rounded-3xl bg-muted" aria-hidden="true" />
        )}

        {/* Minimal identity: no decorative cover or duplicated account metrics. */}
        <section className="rounded-3xl border border-border bg-card p-4 shadow-sm sm:p-5">
          <div className="flex items-center gap-3">
            <div className="relative size-16 shrink-0">
              <div className="flex size-16 items-center justify-center overflow-hidden rounded-full bg-primary-soft text-2xl font-extrabold text-accent-ink">
                {avatarPreview && !public_id ? (
                  <img
                    src={avatarPreview}
                    alt={t("profile_avatar_alt")}
                    loading="lazy"
                    decoding="async"
                    className="size-full object-cover"
                  />
                ) : (
                  (displayName || initial).trim()[0]
                )}
              </div>
              {!public_id && (
                <>
                  <button
                    type="button"
                    onClick={() => avatarInputRef.current?.click()}
                    className="absolute -bottom-1 -end-1 flex size-8 items-center justify-center rounded-full border-2 border-card bg-primary text-accent-ink-foreground transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
                </>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <h2 className="truncate text-lg font-extrabold text-foreground">{displayName}</h2>
              {!public_id && (
                <p className="mt-0.5 truncate text-sm text-muted-foreground">{user?.email ?? ""}</p>
              )}
              {!public_id && profile.data?.is_phone_verified && (
                <span className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-success">
                  <BadgeCheck className="size-3.5" /> {t("profile_phone_verified")}
                </span>
              )}
              {public_id && user?.id !== public_id && (
                <div className="mt-1">
                  <ReportContentButton
                    targetType="user"
                    targetId={public_id}
                    label={t("profile_report_action")}
                  />
                </div>
              )}
            </div>

            {!public_id && (
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl border border-border px-3 text-sm font-bold text-foreground transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Pencil className="size-4" />
                {t("profile_edit_button")}
              </button>
            )}
          </div>

          {!public_id && (profile.data?.phone || profile.data?.commune || profile.data?.wilaya_id != null) && (
            <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-3">
              {profile.data.phone && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-xs font-semibold text-foreground">
                  <Phone className="size-3.5 text-muted-foreground" />
                  <span dir="ltr">{profile.data.phone}</span>
                </span>
              )}
              {(profile.data.commune || profile.data.wilaya_id != null) && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-xs font-semibold text-foreground">
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
            </div>
          )}
        </section>

        {!public_id && (
          <section className="space-y-3" aria-label={t("profile_activity")}>
            <div className="flex items-center justify-between gap-3">
              <SectionTitle>{t("profile_activity")}</SectionTitle>
              <Link
                to="/notifications"
                className="inline-flex min-h-10 items-center gap-1 rounded-full px-2 text-xs font-bold text-accent-ink transition hover:bg-primary-soft"
              >
                {t("profile_activity_all")}
                <ChevronLeft className="size-4 rtl:rotate-180" aria-hidden="true" />
              </Link>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {[
                {
                  to: "/orders",
                  Icon: Package,
                  label: t("profile_orders"),
                  value: orders.isLoading ? "…" : orders.isError ? "—" : String(orders.data?.length ?? 0),
                },
                {
                  to: "/reservations",
                  Icon: CalendarDays,
                  label: t("profile_reservations"),
                  value: reservations.isLoading ? "…" : reservations.isError ? "—" : String(reservations.data?.length ?? 0),
                },
                {
                  to: "/favorites",
                  Icon: Heart,
                  label: t("profile_favorites"),
                  value: String(favCount),
                },
                {
                  to: "/wallet",
                  Icon: Wallet,
                  label: t("profile_wallet"),
                  value: null,
                },
              ].map(({ to, Icon, label, value }) => (
                <Link
                  key={to}
                  to={to}
                  className="flex min-h-[68px] items-center gap-3 rounded-2xl border border-border bg-card px-3 py-2.5 transition hover:border-primary/50 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-accent-ink">
                    <Icon className="size-5" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1 text-start">
                    <span className="block truncate text-sm font-bold text-foreground">{label}</span>
                    {value !== null && (
                      <span className="mt-0.5 block text-xs tabular-nums text-muted-foreground">{value}</span>
                    )}
                  </span>
                  <ChevronLeft className="size-4 shrink-0 text-muted-foreground rtl:rotate-180" aria-hidden="true" />
                </Link>
              ))}
            </div>

            <div className="overflow-hidden rounded-2xl border border-border bg-card">
              <div className="flex items-center gap-2 border-b border-border px-4 py-3">
                <span className="flex size-9 items-center justify-center rounded-xl bg-primary-soft text-accent-ink">
                  <Bell className="size-4.5" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-bold text-foreground">{t("profile_activity_latest")}</h3>
                  <p className="text-xs text-muted-foreground">{t("profile_notifications_hint")}</p>
                </div>
                {notifications.data?.some((item) => !item.read) && (
                  <span className="rounded-full bg-primary-soft px-2.5 py-1 text-xs font-extrabold text-accent-ink">
                    {notifications.data.filter((item) => !item.read).length}
                  </span>
                )}
              </div>

              {notifications.isLoading && (
                <div className="space-y-3 p-4">
                  {[0, 1, 2].map((item) => (
                    <div key={item} className="h-10 animate-pulse rounded-xl bg-muted" />
                  ))}
                </div>
              )}
              {notifications.isError && (
                <div className="p-3">
                  <ErrorState scope="profile:activity" error={notifications.error} onRetry={() => void notifications.refetch()} />
                </div>
              )}
              {!notifications.isLoading && !notifications.isError && recentNotifications.length === 0 && (
                <div className="px-4 py-6 text-center">
                  <p className="text-sm font-semibold text-foreground">{t("profile_activity_empty")}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{t("profile_activity_empty_hint")}</p>
                </div>
              )}
              {recentNotifications.length > 0 && (
                <ul className="divide-y divide-border">
                  {recentNotifications.map((item) => (
                    <li key={item.id} className="flex items-start gap-3 px-4 py-3">
                      <span className={`mt-1 size-2 shrink-0 rounded-full ${item.read ? "bg-muted-foreground/30" : "bg-primary"}`} aria-hidden="true" />
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-1 text-sm font-semibold text-foreground">{item.title}</p>
                        {item.body && <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{item.body}</p>}
                      </div>
                      <time className="shrink-0 text-[11px] text-muted-foreground" dateTime={item.created_at}>
                        {formatDateTime(item.created_at)}
                      </time>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        )}

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
