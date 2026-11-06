import { useCallback, useEffect, useState } from "react";

/**
 * الولاية المفضّلة للتسوق (اختيار التصفّح) — مصدر واحد مشترك.
 *
 * كانت مخزّنة في `localStorage` وتُقرأ داخل كل صفحة على حدة، فكان تغييرها
 * من صفحة لا يُبَثّ إلى غيرها. الآن كتابة واحدة + حدث مخصّص يبثّ التغيير
 * لكل المكوّناتmounted في نفس الوقت.
 */
const STORAGE_KEY = "arownd:wilaya";
const LEGACY_STORAGE_KEY = "sooqy:wilaya";
const CHANGE_EVENT = "arownd:wilaya-change";

/** يقرأ الولاية المفضّلة من التخزين المحلي. */
export function getSelectedWilaya(): number | null {
  if (typeof window === "undefined") return null;
  try {
    const raw =
      window.localStorage.getItem(STORAGE_KEY) ?? window.localStorage.getItem(LEGACY_STORAGE_KEY);
    if (raw && !window.localStorage.getItem(STORAGE_KEY)) {
      window.localStorage.setItem(STORAGE_KEY, raw);
    }
    if (!raw) return null;
    const n = Number(raw);
    return Number.isInteger(n) && n > 0 ? n : null;
  } catch {
    return null;
  }
}

/** يحفظ الولاية المفضّلة ويبثّ التغيير لكل الشاشات. */
export function setSelectedWilaya(wilaya: number | null): void {
  if (typeof window === "undefined") return;
  try {
    if (wilaya) window.localStorage.setItem(STORAGE_KEY, String(wilaya));
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // التخزين غير متاح (وضع خاص/متصفح خفي) — نتجاهل بصمت
  }
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: wilaya }));
}

/**
 * خطّاف يقرأ الولاية المفضّلة ويبقيها متزامنة بين الشاشات.
 * يعيد `[الولاية, دالة التغيير]`.
 */
export function useSelectedWilaya(): [number | null, (w: number | null) => void] {
  const [wilaya, setWilaya] = useState<number | null>(getSelectedWilaya);

  useEffect(() => {
    const sync = () => setWilaya(getSelectedWilaya());
    window.addEventListener(CHANGE_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(CHANGE_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const change = useCallback((w: number | null) => {
    setSelectedWilaya(w);
    setWilaya(w);
  }, []);

  return [wilaya, change];
}
