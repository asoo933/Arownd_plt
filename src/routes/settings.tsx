import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  Bell,
  FileText,
  Eye,
  EyeOff,
  Globe,
  HelpCircle,
  Info,
  LogOut,
  Monitor,
  Moon,
  RefreshCw,
  Shield,
  Sun,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { showError, showSuccess } from "@/lib/feedback";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import {
  fetchMyProfile,
  fetchMyAccountType,
  setMyProfileVisibility,
} from "@/lib/sooqy";
import { useTheme, type Theme } from "@/lib/theme";
import { PageHeader } from "@/components/sooqy/page-header";
import { MenuCard, MenuRow, SectionTitle } from "@/components/sooqy/list-menu";
import { BottomSheet } from "@/components/sooqy/bottom-sheet";
import { SideSheet } from "@/components/sooqy/side-sheet";
import { cn } from "@/lib/utils";
import { useTranslation, translate } from "@/lib/i18n";
import { parseLocalePrefix, withLocalePrefix } from "@/lib/locale";
import { isAndroidNativePlatform } from "@/lib/platform";
import { clearUserScopedCaches } from "@/lib/pwa";
import { addNativeUpdateListener, checkNativeAppUpdate, completeNativeAppUpdate, startNativeAppUpdate } from "@/lib/native-app-update";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: translate("settings_seo_title") }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const { user } = useAuth();
  const { t, lang } = useTranslation();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { theme, setTheme } = useTheme();
  const [signingOut, setSigningOut] = useState(false);
  const [showTheme, setShowTheme] = useState(false);
  const profile = useQuery({ queryKey: ["my-profile"], queryFn: fetchMyProfile, enabled: !!user });
  const accountType = useQuery({
    queryKey: ["my-account-type", user?.id],
    queryFn: fetchMyAccountType,
    enabled: !!user,
  });
  const [visibilityBusy, setVisibilityBusy] = useState(false);
  const changeVisibility = async () => {
    if (!profile.data || visibilityBusy) return;
    setVisibilityBusy(true);
    try {
      await setMyProfileVisibility(!profile.data.is_public);
      await qc.invalidateQueries({ queryKey: ["my-profile"] });
      showSuccess(!profile.data.is_public ? t("settings_visibility_public_success") : t("settings_visibility_private_success"));
    } catch (error) {
      showError(error);
    } finally {
      setVisibilityBusy(false);
    }
  };
  const [showSecurity, setShowSecurity] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [androidNative, setAndroidNative] = useState(false);
  const [nativeUpdateBusy, setNativeUpdateBusy] = useState(false);
  const [nativeUpdateDownloaded, setNativeUpdateDownloaded] = useState(false);

  useEffect(() => {
    if (!isAndroidNativePlatform()) return;
    setAndroidNative(true);
    let disposed = false;
    let removeUpdateListener: (() => Promise<void>) | undefined;

    void addNativeUpdateListener((state) => {
      if (!disposed && state.downloaded) setNativeUpdateDownloaded(true);
    })
      .then((listener) => {
        if (disposed) void listener.remove();
        else removeUpdateListener = () => listener.remove();
      })
      .catch((error: unknown) => console.warn("[native] Could not subscribe to update state", error));

    return () => {
      disposed = true;
      removeUpdateListener?.();
    };
  }, []);

  const checkAndInstallNativeUpdate = async () => {
    if (nativeUpdateBusy) return;
    setNativeUpdateBusy(true);
    try {
      const status = await checkNativeAppUpdate();
      if (status.downloaded) {
        setNativeUpdateDownloaded(true);
        await completeNativeAppUpdate();
        return;
      }
      if (!status.available) {
        showSuccess(t("settings_update_none"));
        return;
      }

      const updateType =
        status.priority >= 4 && status.immediateAllowed
          ? "immediate"
          : status.flexibleAllowed
            ? "flexible"
            : status.immediateAllowed
              ? "immediate"
              : null;
      if (!updateType) {
        toast.error(t("settings_update_blocked"));
        return;
      }
      await startNativeAppUpdate(updateType);
      showSuccess(updateType === "immediate"
        ? t("settings_update_immediate")
        : t("settings_update_flexible"));
    } catch (error) {
      console.warn("[native] In-app update check failed", error);
      toast.error(t("settings_update_error"));
    } finally {
      setNativeUpdateBusy(false);
    }
  };

  const themeLabel = theme === "system" ? t("settings_theme_system") : theme === "dark" ? t("settings_theme_dark") : t("settings_theme_light");

  const signOut = async () => {
    if (signingOut) return;
    try {
      setSigningOut(true);
      // Remove this native device token while the current user session is still valid.
      const pushToken = typeof window !== "undefined" ? window.localStorage.getItem("arownd-push-token") : null;
      if (pushToken) {
        const { error: unregisterError } = await supabase.rpc("unregister_my_push_device", { _token: pushToken });
        if (unregisterError) throw unregisterError;
        window.localStorage.removeItem("arownd-push-token");
      }
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      await clearUserScopedCaches();
      await qc.invalidateQueries();
      navigate({ to: "/" });
    } catch (error) {
      showError(error);
    } finally {
      setSigningOut(false);
    }
  };

  const changePassword = async () => {
    if (savingPassword) return;
    if (newPassword.length < 8) {
      toast.error(t("settings_password_min"));
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error(t("settings_password_mismatch"));
      return;
    }
    setSavingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      showSuccess(t("settings_password_success"));
      setNewPassword("");
      setConfirmPassword("");
      setShowSecurity(false);
    } catch (e) {
      showError(e);
    } finally {
      setSavingPassword(false);
    }
  };

  if (!user) {
    return (
      <div className="app-page mx-auto max-w-xl pb-6 pt-4">
        <PageHeader title={t("settings_title")} back="/profile" />
        <div className="mt-6 rounded-[var(--radius-card)] border border-border bg-card p-6 text-center">
          <p className="text-body text-muted-foreground">{t("settings_login_hint")}</p>
          <Link to="/auth" className="btn-primary mt-4 w-full">
            {t("settings_login_action")}
          </Link>
        </div>
      </div>
    );
  }

  const name = (user.user_metadata?.["full_name"] as string | undefined) ?? t("settings_default_user");
  const email = user.email ?? "";
  const initial = (email || "؟").slice(0, 1).toUpperCase();

  return (
    <div className="app-page mx-auto max-w-xl space-y-5 pb-6 pt-4">
      <PageHeader title={t("settings_title")} subtitle={t("settings_subtitle")} back="/profile" />

      {/* بطاقة الحساب */}
      <div className="card-premium flex items-center gap-4 p-4">
        <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-primary-soft text-lg font-bold text-accent-ink ring-2 ring-primary/40">
          {initial}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-h3 text-foreground">{name}</p>
          <p className="truncate text-sm text-muted-foreground">{email}</p>
        </div>
        <Link
          to="/profile"
          className="flex min-h-11 shrink-0 items-center rounded-full bg-primary-soft px-4 text-sm font-bold text-accent-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          {t("settings_edit")}
        </Link>
      </div>

      {/* ظهور الملف الشخصي للحسابات الشخصية فقط */}
      {accountType.data === "personal" && (
        <section className="space-y-2">
          <SectionTitle>{t("settings_visibility_section")}</SectionTitle>
          <MenuCard>
            <div className="flex items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <p className="font-bold text-foreground">{t("settings_visibility_title")}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t("settings_visibility_hint")}
                </p>
                <p className="mt-2 text-xs font-semibold text-muted-foreground">
                  {profile.data?.is_public ? t("settings_visibility_public") : t("settings_visibility_private")}
                </p>
              </div>
              <button
                type="button"
                onClick={() => void changeVisibility()}
                disabled={visibilityBusy || profile.isLoading || !profile.data}
                className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border border-border px-4 text-sm font-bold text-foreground transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50"
              >
                {profile.data?.is_public ? (
                  <EyeOff className="size-4" />
                ) : (
                  <Eye className="size-4" />
                )}
                {visibilityBusy
                  ? t("settings_saving")
                  : profile.data?.is_public
                    ? t("settings_make_private")
                     : t("settings_make_public")}
              </button>
            </div>
            {profile.data?.is_public && (
              <div className="px-4 pb-3">
                <Link
                  to="/profile"
                  search={{ public_id: user.id }}
                  className="text-sm font-bold text-accent-ink"
                >
                  {t("settings_preview_public")}
                </Link>
              </div>
            )}
          </MenuCard>
        </section>
      )}


      {/* مجموعة: الحساب */}
      <section className="space-y-2">
        <SectionTitle>{t("settings_account_section")}</SectionTitle>
        <MenuCard>
          <MenuRow
            icon={Shield}
            label={t("settings_security")}
            hint={t("settings_change_password_hint")}
            onClick={() => setShowSecurity(true)}
          />
        </MenuCard>
      </section>

      {androidNative && (
        <section className="space-y-2">
          <SectionTitle>{t("settings_android_section")}</SectionTitle>
          <MenuCard>
            <MenuRow
              icon={RefreshCw}
              label={nativeUpdateDownloaded ? t("settings_install_update") : t("settings_check_update")}
              hint={nativeUpdateDownloaded ? t("settings_download_complete") : t("settings_google_play")}
              onClick={() => void checkAndInstallNativeUpdate()}
            />
          </MenuCard>
          <p className="px-1 text-xs leading-5 text-muted-foreground">
            {t("settings_android_update_note")}
          </p>
        </section>
      )}

      {/* مجموعة: تفضيلات التطبيق */}
      <section className="space-y-2">
        <SectionTitle>{t("settings_preferences_section")}</SectionTitle>
        <MenuCard>
          <MenuRow icon={Bell} label={t("settings_notifications")} hint={t("settings_notifications_hint")} to="/notifications" />
          <MenuRow
            icon={Globe}
            label={t("settings_language")}
            hint={lang === "ar" ? t("english") : t("arabic")}
            onClick={() => {
              const current = parseLocalePrefix(window.location.pathname);
              const pathname = current?.rest ?? window.location.pathname;
              const nextLang = lang === "ar" ? "en" : "ar";
              window.location.assign(
                withLocalePrefix(nextLang, pathname) + window.location.search + window.location.hash,
              );
            }}
          />
          <MenuRow
            icon={Moon}
            label={t("settings_theme")}
            hint={themeLabel}
            onClick={() => setShowTheme(true)}
          />
        </MenuCard>
      </section>

      {/* مجموعة: المساعدة والخصوصية */}
      <section className="space-y-2">
        <SectionTitle>{t("settings_help_section")}</SectionTitle>
        <MenuCard>
          <MenuRow icon={HelpCircle} label={t("settings_help")} to="/help" />
          <MenuRow icon={FileText} label={t("settings_terms")} to="/terms" />
          <MenuRow icon={Info} label={t("settings_about")} to="/about" />
        </MenuCard>
      </section>

      {/* مجموعة: الإجراءات */}
      <section className="space-y-2">
        <SectionTitle>{t("settings_actions_section")}</SectionTitle>
        <MenuCard>
          <MenuRow
            icon={LogOut}
            label={signingOut ? t("settings_signing_out") : t("settings_sign_out")}
            onClick={() => void signOut()}
          />
          <MenuRow
            icon={Trash2}
            label={t("settings_delete_account")}
            hint={t("settings_delete_account_hint")}
            danger
            to="/delete-account"
          />
        </MenuCard>
      </section>

      {/* أسفل الصفحة */}
      <p className="pt-2 text-center text-xs text-muted-foreground">Arownd · {t("settings_beta_footer")}</p>

      {/* الأمان: تغيير كلمة المرور */}
      <SideSheet
        open={showSecurity}
        onOpenChange={(o) => {
          setShowSecurity(o);
          if (!o) {
            setNewPassword("");
            setConfirmPassword("");
          }
        }}
        title={t("settings_password_title")}
        description={t("settings_password_description")}
        footer={
          <button
            type="button"
            onClick={() => void changePassword()}
            disabled={savingPassword}
            className="btn-primary w-full py-3 disabled:opacity-50"
          >
            {savingPassword ? t("settings_saving") : t("settings_password_submit")}
          </button>
        }
      >
        <div className="space-y-4">
          <div>
            <label
              htmlFor="new-password"
              className="mb-1 block text-xs font-bold text-muted-foreground"
            >
              {t("settings_password_new")}
            </label>
            <input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
              dir="ltr"
              className="min-h-[var(--control-height)] w-full rounded-[var(--radius-control)] border border-input bg-background px-3 text-start outline-none transition focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
          </div>
          <div>
            <label
              htmlFor="confirm-password"
              className="mb-1 block text-xs font-bold text-muted-foreground"
            >
              {t("settings_password_confirm")}
            </label>
            <input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              dir="ltr"
              className="h-[var(--control-height)] w-full rounded-[var(--radius-control)] border border-input bg-background px-3 text-start outline-none transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
            />
          </div>
        </div>
      </SideSheet>
      {/* نافذة اختيار المظهر — Modal مركّز في وسط الشاشة */}
      <BottomSheet
        open={showTheme}
        onClose={() => setShowTheme(false)}
        title={t("settings_theme_title")}
        subtitle={t("settings_theme_subtitle")}
        modal
        width={320}
        footer={
          <button
            type="button"
            onClick={() => setShowTheme(false)}
            className="btn-secondary w-full"
          >
            {t("settings_cancel")}
          </button>
        }
      >
        <div className="space-y-2">
          {(
            [
              { value: "light", label: t("settings_theme_light"), icon: Sun },
              { value: "dark", label: t("settings_theme_dark"), icon: Moon },
              { value: "system", label: t("settings_theme_system"), icon: Monitor },
            ] as {
              value: Theme;
              label: string;
              icon: React.ComponentType<{ className?: string }>;
            }[]
          ).map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                setTheme(opt.value);
                setShowTheme(false);
              }}
              className={cn(
                "flex w-full items-center gap-3 rounded-[var(--radius-card)] px-4 py-3 text-sm font-bold transition",
                theme === opt.value
                  ? "bg-primary text-accent-ink-foreground"
                  : "border border-border bg-background text-foreground",
              )}
            >
              <opt.icon className="size-4.5 shrink-0" />
              <span>{opt.label}</span>
              {theme === opt.value && (
                <span aria-hidden className="ms-auto">
                  ✓
                </span>
              )}
            </button>
          ))}
        </div>
      </BottomSheet>
    </div>
  );
}
