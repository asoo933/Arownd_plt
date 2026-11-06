import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useLocation,
  useNavigate,
  useRouter,
  HeadContent,
  Scripts,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { useEffect, useRef, useState, type ReactNode } from "react";

// صائد أخطاء الشاشة — يجب أن يُستورد أولًا ليعتمد قبل أي طبقة أخرى (يتجاهل SSR)
import { reportScreenError } from "@/lib/screen-error";
import appCss from "../styles.css?url";
import { AuthProvider } from "@/lib/auth";
import { ENGLISH_ENABLED, ogLocale, translate, useTranslation } from "@/lib/i18n";
// تهيئة Sentry على الويب — قبل سابقًا لم يكن هناك رصد لأخطاء الويب إطلاقًا.
import "@/utils/sentry";
import { AppErrorBoundary, ErrorFallback } from "@/components/AppErrorBoundary";
import { BagProvider } from "@/lib/bag";
import { ThemeProvider } from "@/lib/theme";
import { AccountBottomNav } from "@/components/sooqy/AccountBottomNav";
import { NativeAppUpdatePrompt, PwaPrompt, useServiceWorkerRegistration } from "@/components/sooqy/PwaPrompt";
import { ConnectionBanner } from "@/components/sooqy/ConnectionBanner";
import { DynamicIsland } from "@/components/sooqy/DynamicIsland";
import { PageTransition } from "@/components/sooqy/page-transition";
import { Toaster } from "@/components/ui/sonner";
import { isNativePlatform } from "@/lib/platform";
import { parseNativeAuthCallback, parseNativeRouteLink } from "@/lib/native-deep-links";
import { openExternalUrl, syncNativeStatusBar } from "@/lib/native-sharing";
import { useTheme } from "@/lib/theme";
import { NativePushNotifications } from "@/components/NativePushNotifications";
import { ConfirmDialog } from "@/components/sooqy/confirm-dialog";

function NotFoundComponent() {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-display text-foreground">404</h1>
        <h2 className="mt-4 text-h1 text-foreground">{t("notfound_title")}</h2>
        <p className="mt-2 text-body text-muted-foreground">{t("notfound_hint")}</p>
        <div className="mt-6">
          <Link to="/" className="btn-primary">
            {t("notfound_home")}
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  useEffect(() => {
    reportScreenError(error, "TanStack Router root error boundary");
  }, [error]);
  const router = useRouter();
  const { t } = useTranslation();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-h1 text-foreground">{t("error_title")}</h1>
        <p className="mt-2 text-body text-muted-foreground">{t("error_hint")}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="btn-primary"
          >
            {t("error_retry")}
          </button>
          <a href="/" className="btn-secondary">
            {t("error_home")}
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { title: translate("root_title") },
      {
        name: "description",
        content: translate("root_description"),
      },
      {
        name: "keywords",
        content: translate("root_keywords"),
      },
      { name: "author", content: "Arownd" },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "Arownd" },
      { property: "og:locale", content: ogLocale() },
      ...(ENGLISH_ENABLED
        ? [{ property: "og:locale:alternate", content: ogLocale() === "ar_DZ" ? "en_DZ" : "ar_DZ" }]
        : []),
      { property: "og:image", content: "https://arownd.vercel.app/seo/og.svg" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: translate("root_title") },
      {
        name: "twitter:description",
        content: translate("root_twitter_description"),
      },
      { name: "twitter:image", content: "https://arownd.vercel.app/seo/og.svg" },
    ],
    links: [
      // appCss يreference "" في بيئة الاختبار فقط — تجاهله حتى لا يُرسم <link> بـhref فارغ
      ...(appCss ? [{ rel: "stylesheet", href: appCss }] : []),
      { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap",
      },
      { rel: "preload", href: "/seo/og.svg", as: "image" },
      { rel: "sitemap", href: "/sitemap.xml", type: "application/xml" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  // اللغة والاتجاه يتبعان اختيار المستخدم — أساس الشرط الثنائي (RTL/LTR).
  const { lang } = useTranslation();

  // Testing Library mounts inside a div; render only the app subtree in Vitest.
  // Production SSR must keep the full document shell for TanStack Start.
  if (import.meta.env.MODE === "test") return <>{children}</>;
  const dir = lang === "ar" ? "rtl" : "ltr";
  return (
    <html lang={lang} dir={dir} suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <HeadContent />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Arownd" />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('arownd-theme')||localStorage.getItem('sooqy-theme');var explicit=t==='light'||t==='dark';var mq=window.matchMedia('(prefers-color-scheme: dark)').matches;var d=explicit?t==='dark':mq;var r=document.documentElement;r.classList.toggle('dark',d);if(explicit){r.setAttribute('data-theme',t);}else{r.removeAttribute('data-theme');}var m=document.querySelector('meta[name=theme-color]');if(!m){m=document.createElement('meta');m.setAttribute('name','theme-color');document.head.appendChild(m);}var v=getComputedStyle(r).getPropertyValue('--color-bg-canvas').trim();if(v)m.setAttribute('content',v);}catch(e){}})();`,
          }}
        />
      </head>
      <body>
        <AppErrorBoundary fallback={<ErrorFallback />}>{children}</AppErrorBoundary>
        <Scripts />
      </body>
    </html>
  );
}

function NativeKeyboardSync() {
  useEffect(() => {
    if (!isNativePlatform()) return;

    let disposed = false;
    const handles: Array<{ remove: () => Promise<void> }> = [];
    const show = (height: number) => {
      document.documentElement.dataset["keyboardVisible"] = "true";
      document.documentElement.style.setProperty("--arownd-keyboard-height", `${Math.max(0, height)}px`);
      window.dispatchEvent(new CustomEvent("arownd:keyboard", {
        detail: { visible: true, height: Math.max(0, height) },
      }));
    };
    const hide = () => {
      delete document.documentElement.dataset["keyboardVisible"];
      document.documentElement.style.removeProperty("--arownd-keyboard-height");
      window.dispatchEvent(new CustomEvent("arownd:keyboard", {
        detail: { visible: false, height: 0 },
      }));
    };

    void import("@capacitor/keyboard")
      .then(async ({ Keyboard }) => {
        if (disposed) return;
        handles.push(await Keyboard.addListener("keyboardWillShow", (info) => show(info.keyboardHeight)));
        handles.push(await Keyboard.addListener("keyboardDidShow", (info) => show(info.keyboardHeight)));
        handles.push(await Keyboard.addListener("keyboardWillHide", hide));
        handles.push(await Keyboard.addListener("keyboardDidHide", hide));
        if (disposed) {
          for (const handle of handles) void handle.remove();
        }
      })
      .catch((error: unknown) => {
        console.warn("[native] Could not subscribe to keyboard events", error);
      });

    return () => {
      disposed = true;
      for (const handle of handles) void handle.remove();
      hide();
    };
  }, []);

  return null;
}

function NativeRuntimeSync({ queryClient }: { queryClient: QueryClient }) {
  const { resolved } = useTheme();

  // Keep Android's native status bar synchronized with the app's resolved theme.
  useEffect(() => {
    if (!isNativePlatform()) return;

    const syncStatusBar = () => {
      const tokenColor = getComputedStyle(document.documentElement)
        .getPropertyValue("--color-bg-canvas")
        .trim();
      const bodyColor = getComputedStyle(document.body).backgroundColor;
      const rgb = bodyColor.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
      const bodyHex = rgb
        ? `#${rgb.slice(1, 4).map((channel) => Number(channel).toString(16).padStart(2, "0")).join("")}`
        : undefined;
      const color = /^#[0-9a-f]{6}$/i.test(tokenColor) ? tokenColor : bodyHex;
      void syncNativeStatusBar(
        resolved === "dark",
        color || (resolved === "dark" ? "#111827" : "#ffffff"),
      ).catch((error: unknown) => {
        console.warn("[native] Could not synchronize status bar", error);
      });
    };

    syncStatusBar();
  }, [resolved]);

  // Refresh active queries after returning from the background without
  // introducing a second app-state source of truth.
  useEffect(() => {
    if (!isNativePlatform()) return;

    let disposed = false;
    let removeListener: (() => void) | undefined;

    void import("@capacitor/app")
      .then(async ({ App }) => {
        if (disposed) return;
        const listener = await App.addListener("appStateChange", ({ isActive }) => {
          if (isActive) {
            void queryClient.invalidateQueries({ refetchType: "active" });
          }
        });
        if (disposed) {
          void listener.remove();
        } else {
          removeListener = () => {
            void listener.remove();
          };
        }
      })
      .catch((error: unknown) => {
        console.warn("[native] Could not subscribe to app lifecycle", error);
      });

    return () => {
      disposed = true;
      removeListener?.();
    };
  }, [queryClient]);

  return null;
}


const dirtyForms = new Set<HTMLFormElement>();
const hasUnsavedFormChanges = () => dirtyForms.size > 0;

function UnsavedFormGuard() {
  const { t } = useTranslation();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const pendingAnchor = useRef<HTMLAnchorElement | null>(null);

  useEffect(() => {
    const markDirty = (event: Event) => {
      const target = event.target;
      if (target instanceof HTMLElement) {
        const form = target.closest("form");
        if (form instanceof HTMLFormElement) dirtyForms.add(form);
      }
    };
    const markSubmitted = (event: Event) => {
      if (event.target instanceof HTMLFormElement) dirtyForms.delete(event.target);
    };
    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!hasUnsavedFormChanges()) return;
      event.preventDefault();
      event.returnValue = "";
    };
    const confirmNavigation = (event: MouseEvent) => {
      if (!hasUnsavedFormChanges() || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest("a[href]");
      if (!(anchor instanceof HTMLAnchorElement) || anchor.target === "_blank" || anchor.hasAttribute("download")) return;
      const destination = new URL(anchor.href, window.location.href);
      if (destination.origin !== window.location.origin || destination.href === window.location.href) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      pendingAnchor.current = anchor;
      setConfirmOpen(true);
    };
    document.addEventListener("input", markDirty, true);
    document.addEventListener("change", markDirty, true);
    document.addEventListener("submit", markSubmitted, true);
    document.addEventListener("click", confirmNavigation, true);
    window.addEventListener("beforeunload", warnBeforeUnload);
    return () => {
      document.removeEventListener("input", markDirty, true);
      document.removeEventListener("change", markDirty, true);
      document.removeEventListener("submit", markSubmitted, true);
      document.removeEventListener("click", confirmNavigation, true);
      window.removeEventListener("beforeunload", warnBeforeUnload);
    };
  }, []);

  return (
    <ConfirmDialog
      open={confirmOpen}
      title={t("unsaved_changes_title")}
      message={t("unsaved_changes_message")}
      confirmLabel={t("unsaved_changes_leave")}
      cancelLabel={t("unsaved_changes_stay")}
      tone="danger"
      onCancel={() => {
        pendingAnchor.current = null;
        setConfirmOpen(false);
      }}
      onConfirm={() => {
        const anchor = pendingAnchor.current;
        pendingAnchor.current = null;
        dirtyForms.clear();
        setConfirmOpen(false);
        if (anchor?.isConnected) anchor.click();
      }}
    />
  );
}


function PullToRefresh({ queryClient }: { queryClient: QueryClient }) {
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef<number | null>(null);
  const startX = useRef<number | null>(null);
  const distanceRef = useRef(0);
  const active = useRef(false);
  const refreshInFlight = useRef(false);
  const threshold = 84;

  useEffect(() => {
    let disposed = false;
    const onStart = (event: TouchEvent) => {
      if (refreshInFlight.current || event.touches.length !== 1) return;
      const target = event.target;
      if (target instanceof Element) {
        if (target.closest("input, textarea, select, [contenteditable='true'], [data-no-pull-refresh]")) return;
        let ancestor: Element | null = target;
        while (ancestor && ancestor !== document.body) {
          const style = window.getComputedStyle(ancestor);
          if (/(auto|scroll)/.test(style.overflowY) && ancestor.scrollHeight > ancestor.clientHeight && (ancestor as HTMLElement).scrollTop > 0) return;
          ancestor = ancestor.parentElement;
        }
      }
      if ((document.scrollingElement?.scrollTop ?? window.scrollY) > 0) return;
      startY.current = event.touches[0]?.clientY ?? null;
      startX.current = event.touches[0]?.clientX ?? null;
      active.current = startY.current !== null && startX.current !== null;
    };
    const onMove = (event: TouchEvent) => {
      if (!active.current || startY.current === null || refreshInFlight.current || event.touches.length !== 1) return;
      const touch = event.touches[0];
      const delta = (touch?.clientY ?? startY.current) - startY.current;
      const horizontalDelta = Math.abs((touch?.clientX ?? startX.current ?? 0) - (startX.current ?? 0));
      distanceRef.current = delta > horizontalDelta && delta > 0 ? Math.min(threshold, delta * 0.55) : 0;
      setPullDistance(distanceRef.current);
    };
    const reset = () => {
      active.current = false;
      startY.current = null;
      startX.current = null;
      distanceRef.current = 0;
      setPullDistance(0);
    };
    const onEnd = () => {
      if (!active.current) return;
      const shouldRefresh = distanceRef.current >= threshold * 0.72;
      reset();
      if (!shouldRefresh || refreshInFlight.current) return;
      refreshInFlight.current = true;
      setRefreshing(true);
      void queryClient.invalidateQueries({ refetchType: "active" })
        .catch((error: unknown) => console.warn("[refresh] Could not refresh active queries", error))
        .finally(() => {
          refreshInFlight.current = false;
          if (!disposed) setRefreshing(false);
        });
    };
    document.addEventListener("touchstart", onStart, { passive: true });
    document.addEventListener("touchmove", onMove, { passive: true });
    document.addEventListener("touchend", onEnd, { passive: true });
    document.addEventListener("touchcancel", reset, { passive: true });
    return () => {
      disposed = true;
      document.removeEventListener("touchstart", onStart);
      document.removeEventListener("touchmove", onMove);
      document.removeEventListener("touchend", onEnd);
      document.removeEventListener("touchcancel", reset);
    };
  }, [queryClient]);

  if (pullDistance === 0 && !refreshing) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 top-[env(safe-area-inset-top)] z-[100] flex justify-center" role="status" aria-live="polite">
      <div className="rounded-full border border-border bg-background/95 px-4 py-2 text-sm text-foreground shadow-lg">
        {refreshing ? "جارٍ تحديث المحتوى…" : pullDistance >= threshold * 0.72 ? "اترك للتحديث" : "اسحب للأسفل للتحديث"}
      </div>
    </div>
  );
}

function NativeBackButtonHandler() {
  const router = useRouter();
  const location = useLocation();
  const { t } = useTranslation();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const pendingBack = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!isNativePlatform()) return;

    let disposed = false;
    let removeListener: (() => void) | undefined;

    void import("@capacitor/app")
      .then(async ({ App }) => {
        if (disposed) return;
        const listener = await App.addListener("backButton", ({ canGoBack }) => {
          const continueBack = () => {
            if (canGoBack || window.history.length > 1) {
              router.history.back();
              return;
            }
            if (location.pathname !== "/") {
              void router.navigate({ to: "/" });
              return;
            }
            void App.exitApp();
          };
          if (hasUnsavedFormChanges()) {
            pendingBack.current = () => {
              dirtyForms.clear();
              continueBack();
            };
            setConfirmOpen(true);
            return;
          }
          continueBack();
        });

        if (disposed) {
          void listener.remove();
        } else {
          removeListener = () => {
            void listener.remove();
          };
        }
      })
      .catch((error: unknown) => {
        console.warn("[native] Could not subscribe to Android back button", error);
      });

    return () => {
      disposed = true;
      removeListener?.();
    };
  }, [router, location.pathname]);

  return (
    <ConfirmDialog
      open={confirmOpen}
      title={t("unsaved_changes_title")}
      message={t("unsaved_changes_message")}
      confirmLabel={t("unsaved_changes_leave")}
      cancelLabel={t("unsaved_changes_stay")}
      tone="danger"
      onCancel={() => {
        pendingBack.current = null;
        setConfirmOpen(false);
      }}
      onConfirm={() => {
        const continueBack = pendingBack.current;
        pendingBack.current = null;
        setConfirmOpen(false);
        continueBack?.();
      }}
    />
  );
}

function NativeExternalLinkHandler() {
  useEffect(() => {
    if (!isNativePlatform()) return;

    const handleClick = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) return;
      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest("a[href]");
      if (!(anchor instanceof HTMLAnchorElement) || anchor.hasAttribute("download")) return;

      let url: URL;
      try {
        url = new URL(anchor.href, window.location.href);
      } catch {
        return;
      }
      const isWebLink = url.protocol === "https:" || url.protocol === "http:";
      const isSystemLink = ["tel:", "mailto:", "sms:", "geo:"].includes(url.protocol);
      if (!isWebLink && !isSystemLink) return;
      if (isWebLink && url.origin === window.location.origin) return;

      event.preventDefault();
      event.stopPropagation();
      void openExternalUrl(url.toString()).catch((error: unknown) => {
        console.warn("[native] Could not open external link", error);
      });
    };

    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, []);

  return null;
}

function NativeDeepLinkListener() {
  const navigate = useNavigate();

  useEffect(() => {
    if (!isNativePlatform()) return;

    let disposed = false;
    let lastHandledUrl: string | undefined;
    let removeListener: (() => void) | undefined;

    const handleUrl = async (rawUrl: string) => {
      if (disposed || rawUrl === lastHandledUrl) return;
      const callback = parseNativeAuthCallback(rawUrl);
      const route = callback ? null : parseNativeRouteLink(rawUrl);
      if (!callback && !route) return;

      // The launch URL and appUrlOpen event can both report the same URL.
      // Process only registered auth callbacks or validated app-owned routes.
      lastHandledUrl = rawUrl;
      try {
        if (callback) {
          await navigate({
            to: "/auth/callback",
            search: callback,
            replace: true,
          });
        } else if (route) {
          await navigate({ to: route as never, replace: true });
        }
      } catch (error) {
        console.error("[native] Could not open validated app link", error);
      }
    };

    void import("@capacitor/app")
      .then(async ({ App }) => {
        if (disposed) return;
        const listener = await App.addListener("appUrlOpen", ({ url }) => {
          void handleUrl(url);
        });
        if (disposed) {
          void listener.remove();
          return;
        }
        removeListener = () => {
          void listener.remove();
        };

        const launch = await App.getLaunchUrl();
        if (!disposed && launch?.url) await handleUrl(launch.url);
      })
      .catch((error: unknown) => {
        console.error("[native] Capacitor App plugin failed to initialize", error);
      });

    return () => {
      disposed = true;
      removeListener?.();
    };
  }, [navigate]);

  return null;
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  useServiceWorkerRegistration();
  const location = useLocation();
  const isAuth = location.pathname === "/auth";
  const isMap = location.pathname === "/map" || location.pathname.endsWith("/map");
  // Merchant Studio needs the full desktop canvas; consumer pages stay phone-first.
  const isStudio = location.pathname === "/studio" || location.pathname.startsWith("/studio/");

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <NativeRuntimeSync queryClient={queryClient} />
          <NativeAppUpdatePrompt />
          <NativeKeyboardSync />
          <NativePushNotifications />
          <NativeDeepLinkListener />
          <NativeBackButtonHandler />
          <UnsavedFormGuard />
          <PullToRefresh queryClient={queryClient} />
          <NativeExternalLinkHandler />
          <BagProvider>
            <div
              className={
                isAuth || isMap
                  ? "min-h-dvh w-full min-w-0 max-w-none overflow-x-clip pt-[env(safe-area-inset-top)] pb-0"
                  : isStudio
                    ? "min-h-dvh w-full min-w-0 max-w-none overflow-x-clip pt-[env(safe-area-inset-top)] pb-[calc(var(--nav-height)+env(safe-area-inset-bottom))]"
                    : "mx-auto min-h-dvh w-full min-w-0 max-w-7xl overflow-x-clip pt-[env(safe-area-inset-top)] pb-[calc(var(--nav-height)+env(safe-area-inset-bottom))]"
              }
            >
              <PageTransition>
                <Outlet />
              </PageTransition>
            </div>
            {!isAuth && !isMap && (
              <>
                <ConnectionBanner />
                <DynamicIsland />
                <AccountBottomNav />
                <PwaPrompt />
              </>
            )}
            <Toaster position="top-center" richColors />
          </BagProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
