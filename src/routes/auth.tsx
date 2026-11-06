import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import {
  ArrowLeft,
  Check,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  MailCheck,
  ShieldCheck,
  Store,
  Truck,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { translate, useTranslation } from "@/lib/i18n";
import { ArowndLogo } from "@/components/sooqy/logo";
import { isNativePlatform } from "@/lib/platform";

type AuthScreen = "signin" | "signup" | "forgot" | "reset";
type AccountType = "customer" | "merchant" | "delivery";

function buildAuthRedirect(params: Record<string, string | undefined>) {
  const callbackBase =
    typeof window !== "undefined" && isNativePlatform()
      ? "com.arownd.app://auth/callback"
      : typeof window !== "undefined"
        ? window.location.origin + "/auth/callback"
        : "http://localhost/auth/callback";
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) query.set(key, value);
  }
  const suffix = query.toString();
  return suffix ? callbackBase + "?" + suffix : callbackBase;
}

export const Route = createFileRoute("/auth")({
  validateSearch: (
    s: Record<string, unknown>,
  ): { redirect?: string | undefined; reset?: boolean } => ({
    redirect:
      typeof s["redirect"] === "string" &&
      s["redirect"].startsWith("/") &&
      !s["redirect"].startsWith("//") &&
      !s["redirect"].includes("\\")
        ? s["redirect"]
        : undefined,
    reset: s["reset"] === "1" || s["reset"] === true || s["reset"] === "true",
  }),
  head: () => ({
    meta: [
      { title: translate("auth_seo_title") },
      { name: "description", content: translate("auth_seo_description") },
      { property: "og:title", content: translate("auth_seo_title") },
      { property: "og:description", content: translate("auth_seo_og") },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { redirect, reset } = Route.useSearch();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t, isRTL } = useTranslation();
  const [screen, setScreen] = useState<AuthScreen>(reset ? "reset" : "signin");
  const [accountType, setAccountType] = useState<AccountType>("customer");
  const [signupStep, setSignupStep] = useState<1 | 2>(1);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);

  useEffect(() => {
    if (user && screen === "signin" && !reset) {
      // Merchant registrations must always complete store onboarding before
      // entering the personal area. Existing stores are redirected to /studio
      // by the create-store route.
      if (user.user_metadata?.["account_type"] === "merchant") {
        navigate({ to: "/create-store", replace: true });
        return;
      }
      navigate({ to: (redirect ?? "/profile") as "/", replace: true });
    }
  }, [user, screen, redirect, navigate, reset]);

  const changeScreen = (next: AuthScreen) => {
    setScreen(next);
    setSignupStep(1);
    setVerificationSent(false);
    setShowPassword(false);
  };

  const continueAfterSignup = (type: AccountType) => {
    if (type === "merchant") {
      navigate({ to: "/create-store", replace: true });
    } else if (type === "delivery") {
      navigate({ to: "/delivery-register", replace: true });
    } else {
      navigate({ to: "/profile", search: { setup: true }, replace: true });
    }
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (busy) return;

    if (screen === "signup" && signupStep === 1) {
      setSignupStep(2);
      return;
    }

    if ((screen === "signup" || screen === "reset") && password !== confirmPassword) {
      toast.error(t("passwords_do_not_match"));
      return;
    }

    setBusy(true);
    try {
      if (screen === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: buildAuthRedirect({ reset: "1" }),
        });
        if (error) throw error;
        toast.success(t("email_registered"));
        changeScreen("signin");
      } else if (screen === "reset") {
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        toast.success(t("password_updated"));
        navigate({ to: "/", replace: true });
      } else if (screen === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: buildAuthRedirect({
              intent: accountType,
              redirect,
            }),
            // Preserve the selected account intent through email confirmation
            // so the callback can enforce merchant onboarding on any device.
            data: { full_name: name.trim(), account_type: accountType },
          },
        });
        if (error) throw error;

        if (data.session) {
          continueAfterSignup(accountType);
        } else {
          setVerificationSent(true);
          toast.success(t("account_created"));
        }
      }
    } catch (error) {
      const authError = error as { message?: string; code?: string };
      if (screen === "forgot") {
        // Keep the response generic to avoid revealing whether an email exists.
        toast.success(t("email_registered"));
        changeScreen("signin");
      } else if (typeof navigator !== "undefined" && !navigator.onLine) {
        toast.error(t("feedback_network_error"));
      } else if (screen === "signup") {
        toast.error(t("account_creation_failed"));
      } else if (screen === "signin" && authError.code === "email_not_confirmed") {
        toast.error(t("auth_email_not_confirmed"));
      } else {
        toast.error(t("invalid_credentials"));
      }
      console.debug("[auth]", authError.message ?? "Authentication request failed");
    } finally {
      setBusy(false);
    }
  };

  const accountTypes = [
    {
      id: "customer" as const,
      number: "01",
      title: t("auth_customer_title"),
      description: t("auth_customer_description"),
      Icon: UserRound,
    },
    {
      id: "merchant" as const,
      number: "02",
      title: t("auth_merchant_title"),
      description: t("auth_merchant_description"),
      Icon: Store,
    },
    {
      id: "delivery" as const,
      number: "03",
      title: t("auth_delivery_title"),
      description: t("auth_delivery_description"),
      Icon: Truck,
    },
  ];

  const isSignup = screen === "signup";
  const isReset = screen === "reset";
  const isForgot = screen === "forgot";

  return (
    <div dir={isRTL ? "rtl" : "ltr"} className="min-h-dvh w-full bg-background text-foreground">
      <main className="flex min-h-dvh flex-col px-4 pb-8 pt-4 sm:px-8 lg:px-6 lg:py-10 xl:px-8">
        <div className="mx-auto flex w-full max-w-lg flex-1 flex-col lg:justify-center">
          <header className="mb-7 flex items-center justify-between">
            <ArowndLogo className="h-8 w-auto lg:h-9" width={160} height={40} />
            <Link
              to="/"
              aria-label={t("common_back")}
              className="inline-flex size-11 items-center justify-center rounded-full border border-border text-muted-foreground transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ink"
            >
              <ArrowLeft className="size-5 rtl:rotate-180" />
            </Link>
          </header>

          {!isForgot && !isReset && (
            <div className="mb-8 border-b border-border">
              <div className="flex gap-8">
                <button
                  type="button"
                  onClick={() => changeScreen("signin")}
                  aria-current={screen === "signin" ? "page" : undefined}
                  className={
                    "border-b-2 pb-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 " +
                    (screen === "signin"
                      ? "border-accent-ink text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground")
                  }
                >
                  {t("sign_in")}
                </button>
                <button
                  type="button"
                  onClick={() => changeScreen("signup")}
                  aria-current={screen === "signup" ? "page" : undefined}
                  className={
                    "border-b-2 pb-3 text-sm font-semibold transition-colors " +
                    (screen === "signup"
                      ? "border-accent-ink text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground")
                  }
                >
                  {t("sign_up")}
                </button>
              </div>
            </div>
          )}

          <section aria-live="polite">
            {isForgot ? (
              <>
                <p className="mb-2 text-xs font-semibold tracking-[0.16em] text-accent-ink">
                  {t("auth_recovery_eyebrow")}
                </p>
                <h2 className="text-3xl font-semibold tracking-tight">{t("auth_forgot_title")}</h2>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">
                  {t("auth_forgot_description")}
                </p>
              </>
            ) : isReset ? (
              <>
                <p className="mb-2 text-xs font-semibold tracking-[0.16em] text-accent-ink">
                  {t("auth_recovery_eyebrow")}
                </p>
                <h2 className="text-3xl font-semibold tracking-tight">{t("auth_reset_title")}</h2>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">
                  {t("auth_reset_description")}
                </p>
              </>
            ) : (
              <>
                <p className="mb-2 text-xs font-semibold tracking-[0.16em] text-accent-ink">
                  {isSignup ? t("auth_signup_eyebrow") : t("auth_signin_eyebrow")}
                </p>
                <h2 className="text-3xl font-semibold tracking-tight">
                  {isSignup
                    ? signupStep === 1
                      ? t("auth_choose_account_title")
                      : t("auth_signup_details_title")
                    : t("auth_signin_title")}
                </h2>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">
                  {isSignup
                    ? signupStep === 1
                      ? t("auth_choose_account_description")
                      : t("auth_signup_details_description")
                    : t("auth_signin_description")}
                </p>
              </>
            )}
          </section>

          {verificationSent ? (
            <div className="mt-8 rounded-[var(--radius-card)] border border-primary/50 bg-primary/10 p-5">
              <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <MailCheck className="size-6" />
              </div>
              <h3 className="text-lg font-semibold">{t("auth_confirmation_title")}</h3>
              <p className="mt-2 break-all text-sm font-medium">{email}</p>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                {t("auth_confirmation_description")}
              </p>
              <button
                type="button"
                onClick={() => changeScreen("signin")}
                className="mt-5 min-h-11 text-sm font-semibold text-accent-ink underline underline-offset-4"
              >
                {t("auth_back_to_signin")}
              </button>
            </div>
          ) : (
            <form onSubmit={submit} className="mt-8 space-y-5">
              {isSignup && signupStep === 1 && (
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-muted-foreground">
                    {t("auth_account_type_label")}
                  </p>
                  {accountTypes.map(({ id, number, title, description, Icon }) => {
                    const selected = accountType === id;
                    return (
                      <button
                        key={id}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => setAccountType(id)}
                        className={
                          "group flex min-h-22 w-full items-center gap-4 rounded-[var(--radius-card)] border p-4 text-start transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ink " +
                          (selected
                            ? "border-accent-ink bg-primary/10"
                            : "border-border bg-card hover:border-accent-ink/50")
                        }
                      >
                        <span className="w-8 shrink-0 text-sm font-semibold tabular-nums text-accent-ink">
                          {number}
                        </span>
                        <span className="flex min-w-0 flex-1 flex-col gap-1">
                          <span className="font-semibold text-foreground">{title}</span>
                          <span className="text-xs leading-5 text-muted-foreground">
                            {description}
                          </span>
                        </span>
                        <span
                          className={
                            "flex size-11 shrink-0 items-center justify-center rounded-[var(--radius-control)] transition-colors " +
                            (selected
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-muted-foreground")
                          }
                        >
                          <Icon className="size-5" />
                        </span>
                        <span
                          className={
                            "flex size-5 shrink-0 items-center justify-center rounded-full border " +
                            (selected
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border text-transparent")
                          }
                        >
                          <Check className="size-3" />
                        </span>
                      </button>
                    );
                  })}
                  <p className="pt-1 text-xs leading-6 text-muted-foreground">
                    {t("auth_account_type_note")}
                  </p>
                </div>
              )}

              {isSignup && signupStep === 2 && (
                <>
                  <div className="flex items-center justify-between rounded-[var(--radius-control)] bg-muted/60 px-4 py-3">
                    <div>
                      <p className="text-xs text-muted-foreground">{t("auth_selected_account")}</p>
                      <p className="mt-1 text-sm font-semibold">
                        {accountTypes.find((item) => item.id === accountType)?.title}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSignupStep(1)}
                      className="text-xs font-semibold text-accent-ink underline underline-offset-4"
                    >
                      {t("auth_change_account")}
                    </button>
                  </div>
                  <label className="block space-y-2">
                    <span className="text-sm font-medium">{t("auth_name_label")}</span>
                    <span className="relative block">
                      <UserRound className="pointer-events-none absolute end-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
                      <input
                        required
                        autoComplete="name"
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        placeholder={t("enter_name")}
                        className="h-[var(--control-height)] w-full rounded-[var(--radius-control)] border border-border bg-background px-4 pe-12 text-sm outline-none transition focus-visible:outline-none focus-visible:border-accent-ink focus-visible:ring-2 focus-visible:ring-primary/30"
                      />
                    </span>
                  </label>
                </>
              )}

              {!isReset && (
                <label className="block space-y-2">
                  <span className="text-sm font-medium">{t("auth_email_label")}</span>
                  <span className="relative block">
                    <Mail className="pointer-events-none absolute end-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
                    <input
                      required
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder={t("enter_email")}
                      className="h-[var(--control-height)] w-full rounded-[var(--radius-control)] border border-border bg-background px-4 pe-12 text-sm outline-none transition focus-visible:outline-none focus-visible:border-accent-ink focus-visible:ring-2 focus-visible:ring-primary/30"
                    />
                  </span>
                </label>
              )}

              {!isForgot && (
                <label className="block space-y-2">
                  <span className="text-sm font-medium">
                    {isReset ? t("auth_new_password_label") : t("auth_password_label")}
                  </span>
                  <span className="relative block">
                    <LockKeyhole className="pointer-events-none absolute end-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
                    <input
                      required
                      type={showPassword ? "text" : "password"}
                      autoComplete={isReset || isSignup ? "new-password" : "current-password"}
                      minLength={8}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder={t("enter_password")}
                      className="h-[var(--control-height)] w-full rounded-[var(--radius-control)] border border-border bg-background px-4 pe-12 ps-12 text-sm outline-none transition focus-visible:outline-none focus-visible:border-accent-ink focus-visible:ring-2 focus-visible:ring-primary/30"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((visible) => !visible)}
                      aria-label={showPassword ? t("hide_password") : t("show_password")}
                      className="absolute start-3 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
                    >
                      {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
                    </button>
                  </span>
                  {(isSignup || isReset) && (
                    <span className="block text-xs text-muted-foreground">
                      {t("auth_password_hint")}
                    </span>
                  )}
                </label>
              )}

              {(isSignup || isReset) && (
                <label className="block space-y-2">
                  <span className="text-sm font-medium">{t("auth_confirm_password_label")}</span>
                  <span className="relative block">
                    <LockKeyhole className="pointer-events-none absolute end-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
                    <input
                      required
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      minLength={8}
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      placeholder={t("confirm_password")}
                      className="h-[var(--control-height)] w-full rounded-[var(--radius-control)] border border-border bg-background px-4 pe-12 text-sm outline-none transition focus-visible:outline-none focus-visible:border-accent-ink focus-visible:ring-2 focus-visible:ring-primary/30"
                    />
                  </span>
                </label>
              )}

              {screen === "signin" && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => changeScreen("forgot")}
                    className="min-h-[var(--control-height-compact)] text-sm font-semibold text-accent-ink underline underline-offset-4"
                  >
                    {t("forgot_password")}
                  </button>
                </div>
              )}

              {isForgot && (
                <p className="text-xs leading-6 text-muted-foreground">
                  {t("auth_forgot_description")}
                </p>
              )}

              <div className="space-y-3 pt-1">
                <button
                  type="submit"
                  disabled={busy}
                  className="btn-primary flex min-h-[var(--control-height)] w-full items-center justify-center gap-2 rounded-[var(--radius-control)] px-5 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {busy ? (
                    <span>{t("loading")}</span>
                  ) : (
                    <>
                      <span>
                        {isForgot
                          ? t("auth_send_reset")
                          : isReset
                            ? t("auth_save_password")
                            : isSignup
                              ? signupStep === 1
                                ? t("auth_continue")
                                : t("sign_up")
                              : t("sign_in")}
                      </span>
                      <ArrowLeft className="size-4 rtl:rotate-180" />
                    </>
                  )}
                </button>
                {isSignup && signupStep === 2 && (
                  <button
                    type="button"
                    onClick={() => setSignupStep(1)}
                    className="min-h-11 w-full text-sm font-medium text-muted-foreground hover:text-foreground"
                  >
                    {t("auth_back_to_account_type")}
                  </button>
                )}
              </div>
            </form>
          )}

          {!verificationSent && !isForgot && !isReset && (
            <div className="mt-7 flex items-start gap-3 rounded-[var(--radius-control)] bg-muted/50 p-4">
              <ShieldCheck className="mt-0.5 size-5 shrink-0 text-accent-ink" />
              <p className="text-xs leading-6 text-muted-foreground">
                {isSignup ? t("auth_email_confirmation_note") : t("auth_secure_note")}
              </p>
            </div>
          )}

          {isForgot && (
            <button
              type="button"
              onClick={() => changeScreen("signin")}
              className="mt-6 min-h-11 text-sm font-semibold text-accent-ink underline underline-offset-4"
            >
              {t("auth_back_to_signin")}
            </button>
          )}

          <p className="mt-8 text-center text-xs leading-6 text-muted-foreground">
            {t("terms_agreement")}{" "}
            <Link to="/terms" className="font-semibold text-accent-ink underline">
              {t("terms")}
            </Link>{" "}
            {t("and")}{" "}
            <Link to="/privacy" className="font-semibold text-accent-ink underline">
              {t("privacy")}
            </Link>
          </p>
        </div>

        <footer className="mx-auto mt-8 flex w-full max-w-lg items-center justify-center gap-2 text-caption text-muted-foreground lg:mt-4">
          <LockKeyhole className="size-3.5" />
          <span>{t("auth_footer_note")}</span>
        </footer>
      </main>
    </div>
  );
}
