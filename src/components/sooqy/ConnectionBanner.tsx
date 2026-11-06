import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { WifiOff, RefreshCw, ShieldCheck } from "lucide-react";
import { useOnline } from "@/lib/conn";

/** صفحة انقطاع الاتصال — تحافظ على سياق التطبيق وتوضح طريقة العودة. */
export function ConnectionBanner() {
  const online = useOnline();
  const queryClient = useQueryClient();
  const wasOffline = useRef(false);

  useEffect(() => {
    if (online && wasOffline.current) {
      wasOffline.current = false;
      void queryClient.invalidateQueries();
    } else if (!online) {
      wasOffline.current = true;
    }
  }, [online, queryClient]);

  if (online) return null;

  return (
    <main
      role="alert"
      aria-live="assertive"
      className="fixed inset-0 z-[200] flex min-h-[100dvh] items-center justify-center overflow-y-auto bg-background px-5 py-10"
    >
      <section className="w-full max-w-md text-center">
        <div className="mx-auto mb-6 flex size-24 items-center justify-center rounded-full bg-warning-soft text-warning">
          <WifiOff className="size-11" strokeWidth={1.8} aria-hidden="true" />
        </div>
        <p className="mb-2 text-xs font-extrabold tracking-wide text-muted-foreground">AROWND · الاتصال</p>
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground">يبدو أنك غير متصل بالإنترنت</h1>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-7 text-muted-foreground">
          لا تقلق، لم نفقد مكانك في التطبيق. تحقّق من اتصال Wi-Fi أو بيانات الهاتف، ثم أعد المحاولة للمتابعة.
        </p>

        <div className="mt-7 rounded-[var(--radius-card)] border border-border bg-card p-4 text-start">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 size-5 shrink-0 text-accent-ink" aria-hidden="true" />
            <div>
              <p className="text-sm font-bold text-foreground">بياناتك بأمان</p>
              <p className="mt-1 text-xs leading-6 text-muted-foreground">
                قد لا تتوفر بعض المعلومات والعمليات حتى يعود الاتصال. لن نؤكد نجاح أي عملية قبل وصولها إلى الخادم.
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-6 inline-flex min-h-[var(--control-height)] w-full items-center justify-center gap-2 rounded-[var(--radius-control)] bg-primary px-5 py-3 font-extrabold text-primary-foreground transition active:scale-[var(--scale-pressed)]"
        >
          <RefreshCw className="size-4" aria-hidden="true" />
          إعادة المحاولة
        </button>
        <p className="mt-4 text-xs text-muted-foreground">ستعود إلى الصفحة تلقائيًا بعد استعادة الاتصال.</p>
      </section>
    </main>
  );
}
