import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Fingerprint, LockKeyhole, LogOut, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { isAndroidNativePlatform } from "@/lib/platform";
import { clearUserScopedCaches } from "@/lib/pwa";
import { authenticateNativeBiometric, getNativeBiometricStatus } from "@/lib/native-biometric";

type GateState = "checking" | "locked" | "unlocked";

export function NativeBiometricGate() {
  const navigate = useNavigate();
  const [gateState, setGateState] = useState<GateState>("checking");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const retryRef = useRef<(() => Promise<void>) | null>(null);

  useEffect(() => {
    if (!isAndroidNativePlatform()) {
      setGateState("unlocked");
      return;
    }

    let disposed = false;
    let enabled = false;
    let needsUnlock = true;
    let authenticating = false;
    let removeAppListener: (() => void) | undefined;
    const authState = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        needsUnlock = false;
        if (!disposed) setGateState("unlocked");
      } else if (event === "SIGNED_IN") {
        // A successful password sign-in is already an explicit unlock.
        needsUnlock = false;
        if (!disposed) setGateState("unlocked");
      }
    });

    const attemptUnlock = async () => {
      if (disposed || !enabled || !needsUnlock || authenticating) return;
      authenticating = true;
      setBusy(true);
      setGateState("locked");
      setMessage("");
      try {
        await authenticateNativeBiometric();
        needsUnlock = false;
        if (!disposed) setGateState("unlocked");
      } catch {
        if (!disposed) {
          setGateState("locked");
          setMessage("تعذّر إكمال التحقق. أعد المحاولة أو سجّل الخروج للدخول بكلمة المرور.");
        }
      } finally {
        authenticating = false;
        if (!disposed) setBusy(false);
      }
    };
    retryRef.current = attemptUnlock;

    void import("@capacitor/app")
      .then(async ({ App }) => {
        if (disposed) return;
        const listener = await App.addListener("appStateChange", ({ isActive }) => {
          if (!enabled) return;
          if (!isActive) {
            needsUnlock = true;
            setGateState("locked");
            setMessage("");
          } else if (needsUnlock) {
            void attemptUnlock();
          }
        });
        if (disposed) void listener.remove();
        else removeAppListener = () => { void listener.remove(); };
      })
      .catch((error: unknown) => console.warn("[native] Could not subscribe to biometric app lock lifecycle", error));

    void Promise.all([getNativeBiometricStatus(), supabase.auth.getSession()])
      .then(([status, sessionResult]) => {
        if (disposed) return;
        enabled = status.enabled;
        if (!enabled || !sessionResult.data.session) {
          needsUnlock = false;
          setGateState("unlocked");
          return;
        }
        needsUnlock = true;
        setGateState("locked");
        void attemptUnlock();
      })
      .catch((error: unknown) => {
        console.warn("[native] Could not read biometric app lock state", error);
        if (!disposed) {
          setGateState("locked");
          setMessage("تعذّر قراءة إعداد قفل التطبيق. أعد المحاولة أو سجّل الخروج.");
        }
      });

    return () => {
      disposed = true;
      retryRef.current = null;
      removeAppListener?.();
      authState.data.subscription.unsubscribe();
    };
  }, []);

  const signOutAndUsePassword = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      await clearUserScopedCaches();
      setGateState("unlocked");
      await navigate({ to: "/auth", replace: true });
    } catch {
      setMessage("تعذّر تسجيل الخروج. حاول مرة أخرى.");
    } finally {
      setBusy(false);
    }
  };

  if (!isAndroidNativePlatform() || gateState === "unlocked") return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex min-h-dvh items-center justify-center bg-background px-6 py-10 text-foreground"
      role="dialog"
      aria-modal="true"
      aria-labelledby="native-biometric-title"
    >
      <div className="w-full max-w-sm text-center">
        <div className="mx-auto mb-6 flex size-20 items-center justify-center rounded-full bg-primary-soft text-accent-ink">
          {gateState === "checking" ? <LockKeyhole className="size-9" /> : <Fingerprint className="size-10" />}
        </div>
        <h2 id="native-biometric-title" className="text-2xl font-bold">
          {gateState === "checking" ? "جارٍ التحقق من حماية التطبيق" : "افتح Arownd"}
        </h2>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">
          {message || "استخدم البصمة أو التعرّف على الوجه للمتابعة."}
        </p>
        <button
          type="button"
          onClick={() => void retryRef.current?.()}
          disabled={busy || gateState === "checking"}
          className="mt-7 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-primary px-5 font-bold text-accent-ink-foreground disabled:opacity-50"
        >
          <RefreshCw className="size-4" />
          {busy ? "جارٍ التحقق..." : "إعادة المحاولة"}
        </button>
        <button
          type="button"
          onClick={() => void signOutAndUsePassword()}
          disabled={busy}
          className="mt-3 inline-flex min-h-11 items-center justify-center gap-2 px-4 text-sm font-semibold text-muted-foreground disabled:opacity-50"
        >
          <LogOut className="size-4" />
          تسجيل الخروج واستخدام كلمة المرور
        </button>
      </div>
    </div>
  );
}
