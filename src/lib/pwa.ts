declare const __AROWND_BUILD_ID__: string;

/**
 * طبقة PWA — تسجيل Service Worker + إشعار التحديث + زر التثبيت.
 *
 * تُستدعى من `AppShell`/root بعد أول رسم. لا تفعل شيئًا في بيئات
 * لا تدعمها (SSR، WebView قديم، iOS Safari جزئيًا).
 */

import { isNativePlatform } from "@/lib/platform";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

let deferredPrompt: BeforeInstallPromptEvent | null = null;
const updateListeners = new Set<() => void>();
const installListeners = new Set<(canInstall: boolean) => void>();

/** هل التطبيق قابل للتثبيت الآن (المتصفح عرض نافذة التثبيت)؟ */
export function canInstall(): boolean {
  return deferredPrompt !== null;
}

/** يطلب من المتصفح عرض نافذة التثبيت. يُرجع true إذا قبل المستخدم. */
export async function promptInstall(): Promise<boolean> {
  if (!deferredPrompt) return false;
  const ev = deferredPrompt;
  deferredPrompt = null;
  notifyInstall();
  try {
    await ev.prompt();
    const { outcome } = await ev.userChoice;
    return outcome === "accepted";
  } catch {
    return false;
  } finally {
    notifyInstall();
  }
}

/** يشترك في تغيّر إمكانية التثبيت. يُرجع دالة إلغاء الاشتراك. */
export function onInstallChange(cb: (canInstall: boolean) => void): () => void {
  installListeners.add(cb);
  return () => installListeners.delete(cb);
}

/** يشترك في توفّر تحديث جديد. يُرجع دالة إلغاء الاشتراك. */
export function onUpdateAvailable(cb: () => void): () => void {
  updateListeners.add(cb);
  return () => updateListeners.delete(cb);
}

function notifyInstall() {
  const value = deferredPrompt !== null;
  installListeners.forEach((cb) => cb(value));
}

function notifyUpdate() {
  updateListeners.forEach((cb) => cb());
}

/**
 * يمسح أي كاش بيانات قديم عند إنهاء الجلسة.
 * تُرسل الرسالتان للتوافق مع Service Workers السابقة التي كانت تستخدم CLEAR_DATA_CACHE.
 */
export async function clearUserScopedCaches(): Promise<void> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;

  try {
    const registration = await navigator.serviceWorker.getRegistration("/");
    const workers = new Set(
      [navigator.serviceWorker.controller, registration?.active, registration?.waiting].filter(
        (worker): worker is ServiceWorker => worker !== null && worker !== undefined,
      ),
    );

    workers.forEach((worker) => {
      worker.postMessage("CLEAR_USER_DATA");
      worker.postMessage("CLEAR_DATA_CACHE");
    });
  } catch {
    // Logout must not fail because a browser does not support Service Worker cache cleanup.
  }
}

export function applyUpdate(): void {
  navigator.serviceWorker?.getRegistration().then((reg) => {
    reg?.waiting?.postMessage("SKIP_WAITING");
  });
}

let serviceWorkerRegistrationStarted = false;

/**
 * يسجّل Service Worker مرة واحدة.
 * آمن للاستدعاء المتكرر، ويتعامل مع استدعائه قبل أو بعد حدث load.
 */
export function registerServiceWorker(): void {
  if (typeof window === "undefined" || serviceWorkerRegistrationStarted) return;
  // Native apps are updated through the app stores, not a web Service Worker.
  if (isNativePlatform()) return;
  if (!("serviceWorker" in navigator)) return;

  serviceWorkerRegistrationStarted = true;

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredPrompt = event as BeforeInstallPromptEvent;
    notifyInstall();
  });

  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    notifyInstall();
  });

  const register = () => {
    let hasController = Boolean(navigator.serviceWorker.controller);
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (hasController) {
        window.location.reload();
      } else {
        hasController = true;
      }
    });

    const serviceWorkerUrl = new URL("/sw.js", window.location.origin);
    serviceWorkerUrl.searchParams.set("build", __AROWND_BUILD_ID__);

    navigator.serviceWorker
      .register(`${serviceWorkerUrl.pathname}${serviceWorkerUrl.search}`, { scope: "/" })
      .then((registration) => {
        if (registration.waiting) notifyUpdate();
        registration.addEventListener("updatefound", () => {
          const installing = registration.installing;
          if (!installing) return;
          installing.addEventListener("statechange", () => {
            if (installing.state === "installed" && navigator.serviceWorker.controller) {
              notifyUpdate();
            }
          });
        });
      })
      .catch(() => {
        // فشل التسجيل لا يجب أن يُعطّل التطبيق (مثلًا في بيئة غير آمنة)
      });

    window.setInterval(
      () => {
        navigator.serviceWorker
          .getRegistration()
          .then((reg) => reg?.update().catch(() => undefined));
      },
      60 * 60 * 1000,
    );
  };

  if (document.readyState === "complete") {
    register();
  } else {
    window.addEventListener("load", register, { once: true });
  }
}
