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
import { isNativePlatform } from "@/lib/platform";

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
