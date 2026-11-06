import { useEffect, useState } from "react";
import { Download, RefreshCw, X } from "lucide-react";
import {
  applyUpdate,
  canInstall,
  onInstallChange,
  onUpdateAvailable,
  promptInstall,
  registerServiceWorker,
} from "@/lib/pwa";
import { useTranslation } from "@/lib/i18n";
import { isAndroidNativePlatform, isNativePlatform } from "@/lib/platform";

/**
 * عنصر PWA ظاهر — يعرض:
 *  • زر «تثبيت التطبيق» عندما يتيحه المتصفح
 *  • شريط «يتوفر تحديث» عند وجود Service Worker جديد بانتظار التفعيل
 */
export function PwaPrompt() {
  const { t } = useTranslation();
  const [installable, setInstallable] = useState(false);
  const [updateReady, setUpdateReady] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setInstallable(canInstall());
    const offInstall = onInstallChange(setInstallable);
    const offUpdate = onUpdateAvailable(() => setUpdateReady(true));
    return () => {
      offInstall();
      offUpdate();
    };
  }, []);

  // Native releases are installed and updated through Google Play / App Store.
  if (isNativePlatform()) return null;

  if (dismissed) return null;

  if (updateReady) {
    return (
      <div className="pointer-events-none fixed inset-x-0 top-2 z-50 flex justify-center px-4">
        <div className="pointer-events-auto flex w-full max-w-md items-center gap-2 rounded-2xl border border-border bg-card/95 p-3  backdrop-blur">
          <RefreshCw className="size-4 shrink-0 text-primary" />
          <p className="flex-1 text-xs font-bold text-foreground">{t("pwa_update_ready")}</p>
          <button
            type="button"
            onClick={() => {
              applyUpdate();
              setUpdateReady(false);
            }}
            className="min-h-[var(--control-height)] rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground transition active:scale-[var(--scale-pressed)] focus-visible:outline"
          >
            {t("pwa_update_now")}
          </button>
          <button
            type="button"
            aria-label={t("aria_close")}
            onClick={() => setUpdateReady(false)}
            className="icon-btn size-11 shrink-0 rounded-full text-muted-foreground transition active:scale-[var(--scale-pressed)]"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>
    );
  }

  if (!installable) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-40 flex justify-center px-4">
      <div className="pointer-events-auto flex w-full max-w-md items-center gap-2 rounded-2xl border border-border bg-card/95 p-2.5  backdrop-blur">
        <Download className="size-4 shrink-0 text-primary" />
        <p className="flex-1 text-xs font-bold text-foreground">{t("pwa_install_hint")}</p>
        <button
          type="button"
          onClick={async () => {
            const ok = await promptInstall();
            if (!ok) setDismissed(true);
          }}
          className="min-h-[var(--control-height)] rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground transition active:scale-[var(--scale-pressed)] focus-visible:outline"
        >
          {t("pwa_install_cta")}
        </button>
        <button
          type="button"
          aria-label={t("aria_close")}
          onClick={() => setDismissed(true)}
          className="icon-btn size-11 shrink-0 rounded-full text-muted-foreground transition active:scale-[var(--scale-pressed)]"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}

/** يُسجّل Service Worker مرة واحدة عند إقلاع التطبيق. */
export function useServiceWorkerRegistration() {
  useEffect(() => {
    registerServiceWorker();
  }, []);
}


/** Android Google Play in-app updates. PWA update handling above remains web-only. */
export function NativeAppUpdatePrompt() {
  const { t } = useTranslation();
  const [available, setAvailable] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [updateMode, setUpdateMode] = useState<"flexible" | "immediate" | null>(null);

  useEffect(() => {
    if (!isAndroidNativePlatform()) return;

    let disposed = false;
    let listener: { remove: () => Promise<void> } | undefined;

    void import("@capawesome/capacitor-app-update")
      .then(async ({ AppUpdate, AppUpdateAvailability, FlexibleUpdateInstallStatus }) => {
        if (disposed) return;
        listener = await AppUpdate.addListener("onFlexibleUpdateStateChange", (state: { installStatus: number; bytesDownloaded?: number; totalBytesToDownload?: number }) => {
          if (disposed) return;
          if (state.installStatus === FlexibleUpdateInstallStatus.DOWNLOADING) {
            setDownloading(true);
            if (
              typeof state.bytesDownloaded === "number" &&
              typeof state.totalBytesToDownload === "number" &&
              state.totalBytesToDownload > 0
            ) {
              setProgress(Math.min(100, Math.round((state.bytesDownloaded / state.totalBytesToDownload) * 100)));
            }
          } else if (state.installStatus === FlexibleUpdateInstallStatus.DOWNLOADED) {
            setDownloading(false);
            setDownloaded(true);
            setProgress(100);
          } else if (
            state.installStatus === FlexibleUpdateInstallStatus.FAILED ||
            state.installStatus === FlexibleUpdateInstallStatus.CANCELED
          ) {
            setDownloading(false);
            setProgress(null);
          }
        });

        try {
          const info = await AppUpdate.getAppUpdateInfo();
          if (!disposed && info.updateAvailability === AppUpdateAvailability.UPDATE_AVAILABLE) {
            if (info.flexibleUpdateAllowed) {
              setUpdateMode("flexible");
              setAvailable(true);
            } else if (info.immediateUpdateAllowed) {
              setUpdateMode("immediate");
              setAvailable(true);
            }
          } else if (!disposed && info.updateAvailability === AppUpdateAvailability.UPDATE_IN_PROGRESS) {
            setDownloading(true);
          }
        } catch {
          // Play Store installs only; sideloaded builds and unavailable Play services
          // intentionally fall back silently without affecting app startup.
        }
      })
      .catch((error: unknown) => {
        console.warn("[native-update] Google Play update check unavailable", error);
      });

    return () => {
      disposed = true;
      if (listener) void listener.remove();
    };
  }, []);

  if (!available && !downloaded) return null;

  const startUpdate = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const { AppUpdate } = await import("@capawesome/capacitor-app-update");
      if (updateMode === "immediate") {
        await AppUpdate.performImmediateUpdate();
      } else {
        await AppUpdate.startFlexibleUpdate();
        setAvailable(false);
        setDownloading(true);
      }
    } catch (error) {
      console.warn("[native-update] Could not start flexible update", error);
      // An update may only be offered by Play during an eligible install session.
    } finally {
      setBusy(false);
    }
  };

  const finishUpdate = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const { AppUpdate } = await import("@capawesome/capacitor-app-update");
      await AppUpdate.completeFlexibleUpdate();
    } catch (error) {
      console.warn("[native-update] Could not complete flexible update", error);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="pointer-events-none fixed inset-x-0 top-2 z-[60] flex justify-center px-4">
      <div className="pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-2xl border border-border bg-card/95 p-3 shadow-lg backdrop-blur">
        <RefreshCw className="size-4 shrink-0 text-primary" />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold text-foreground">
            {downloaded ? t("native_update_ready") : downloading ? t("native_update_downloading") : t("native_update_ready")}
          </p>
          {downloading && (
            <p className="mt-1 text-[11px] text-muted-foreground">
              {progress === null ? t("native_update_background") : t("native_update_progress", { progress })}
            </p>
          )}
        </div>
        {downloaded ? (
          <button type="button" disabled={busy} onClick={() => void finishUpdate()} className="min-h-10 rounded-full bg-primary px-3 text-xs font-semibold text-primary-foreground disabled:opacity-50">
            {t("native_update_restart")}
          </button>
        ) : !downloading ? (
          <button type="button" disabled={busy} onClick={() => void startUpdate()} className="min-h-10 rounded-full bg-primary px-3 text-xs font-semibold text-primary-foreground disabled:opacity-50">
            {t("native_update_cta")}
          </button>
        ) : null}
      </div>
    </div>
  );
}
