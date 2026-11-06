import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { BagItem } from "./sooqy";
import { useTranslation } from "./i18n";

type BagCtx = {
  items: BagItem[];
  count: number;
  add: (item: BagItem) => void;
  setQty: (lineKey: string, qty: number) => void;
  remove: (lineKey: string) => void;
  removeOffer: (offerId: string) => void;
  clear: () => void;
};

const Ctx = createContext<BagCtx | null>(null);
const KEY = "sooqy:bag";
/** حدث داخل النافذة: يُبَث عند تغيّر السلة من تبويب آخر. */
const SYNC_EVENT = "sooqy:bag-sync";

const MAX_QTY = 10;

/** Stable identity for one purchasable variant in the cart. */
export function bagItemKey(item: Pick<BagItem, "offerId" | "options">): string {
  const options = Object.entries(item.options ?? {})
    .filter(([key, value]) => typeof key === "string" && typeof value === "string")
    .sort(([a], [b]) => a.localeCompare(b));
  return `${item.offerId}::${JSON.stringify(options)}`;
}

/** Clean stored cart rows while preserving different variants of the same offer. */
export function sanitizeBagItems(input: unknown): BagItem[] {
  if (!Array.isArray(input)) return [];
  const byLine = new Map<string, BagItem>();
  for (const raw of input) {
    if (!raw || typeof raw !== "object") continue;
    const r = raw as Partial<BagItem>;
    if (typeof r.offerId !== "string" || r.offerId.length === 0) continue;
    const qty = Math.max(1, Math.min(MAX_QTY, Math.floor(Number(r.quantity)) || 1));
    const options =
      r.options && typeof r.options === "object" && !Array.isArray(r.options)
        ? Object.fromEntries(
            Object.entries(r.options).filter(
              ([key, value]) => typeof key === "string" && typeof value === "string",
            ),
          )
        : {};
    const item: BagItem = {
      offerId: r.offerId,
      quantity: qty,
      options,
      price: typeof r.price === "number" && Number.isFinite(r.price) ? r.price : undefined,
      name: typeof r.name === "string" ? r.name : undefined,
      productId: typeof r.productId === "string" ? r.productId : undefined,
    };
    const key = bagItemKey(item);
    const prev = byLine.get(key);
    byLine.set(key, {
      ...item,
      quantity: prev ? Math.min(MAX_QTY, prev.quantity + qty) : qty,
    });
  }
  return [...byLine.values()];
}

function readStorage(): BagItem[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    return sanitizeBagItems(JSON.parse(raw));
  } catch {
    // تخزين تالف أو غير متاح (وضع خاص) — نبدأ بسلة فارغة بدل إسقاط التطبيق.
    return [];
  }
}

export function BagProvider({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const [items, setItems] = useState<BagItem[]>([]);
  const [storageFailed, setStorageFailed] = useState(false);
  // آخر قيمة للسلة: يمنع ضياع إضافة عند استدعاءين متتاليين قبل إعادة التصيير.
  const itemsRef = useRef<BagItem[]>([]);

  useEffect(() => {
    const initial = readStorage();
    itemsRef.current = initial;
    setItems(initial);
  }, []);

  // مزامنة بين التبويبات: تعديل في تبويب يظهر في الآخر فورًا.
  useEffect(() => {
    const onSync = (e: Event) => {
      // حدث storage يصل لكل مفتاح؛ نتجاهل غير مفتاح السلة.
      if (
        e.type === "storage" &&
        (e as StorageEvent).key !== null &&
        (e as StorageEvent).key !== KEY
      )
        return;
      const detail = (e as CustomEvent<BagItem[] | undefined>).detail;
      const next = detail ? sanitizeBagItems(detail) : readStorage();
      itemsRef.current = next;
      setItems(next);
    };
    window.addEventListener(SYNC_EVENT, onSync);
    window.addEventListener("storage", onSync);
    return () => {
      window.removeEventListener(SYNC_EVENT, onSync);
      window.removeEventListener("storage", onSync);
    };
  }, []);

  const persist = useCallback((next: BagItem[]) => {
    itemsRef.current = next;
    setItems(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
      setStorageFailed(false);
    } catch {
      // الحصة ممتلئة أو التخزين معطّل — نُبقي السلة في الذاكرة بدل إسقاط التطبيق.
      setStorageFailed(true);
    }
    try {
      window.dispatchEvent(new CustomEvent(SYNC_EVENT, { detail: next }));
    } catch {
      /* تجاهل — المزامنة تحسين وليس شرطًا */
    }
  }, []);

  const value = useMemo<BagCtx>(
    () => ({
      items,
      count: items.reduce((s, i) => s + i.quantity, 0),
      add: (item) => {
        const current = itemsRef.current;
        const addQty = Math.max(1, Math.floor(Number(item.quantity)) || 1);
        const key = bagItemKey(item);
        const existing = current.find((i) => bagItemKey(i) === key);
        persist(
          existing
            ? current.map((i) =>
                bagItemKey(i) === key
                  ? {
                      ...i,
                      quantity: Math.min(MAX_QTY, i.quantity + addQty),
                      // نُحدّث لقطة السعر بأحدث قيمة معروفة.
                      price: item.price ?? i.price,
                      name: item.name ?? i.name,
                      productId: item.productId ?? i.productId,
                    }
                  : i,
              )
            : [...current, { ...item, quantity: Math.min(MAX_QTY, addQty) }],
        );
      },
      setQty: (lineKey, qty) =>
        persist(
          itemsRef.current.map((i) =>
            bagItemKey(i) === lineKey
              ? { ...i, quantity: Math.max(1, Math.min(MAX_QTY, Math.floor(Number(qty)) || 1)) }
              : i,
          ),
        ),
      remove: (lineKey) =>
        persist(itemsRef.current.filter((i) => bagItemKey(i) !== lineKey)),
      removeOffer: (offerId) =>
        persist(itemsRef.current.filter((i) => i.offerId !== offerId)),
      clear: () => persist([]),
    }),
    [items, persist],
  );

  return (
    <Ctx.Provider value={value}>
      {children}
      {storageFailed && (
        <div role="status" className="fixed inset-x-0 bottom-24 z-50 mx-auto w-full max-w-2xl px-4">
          <p className="rounded-xl border border-danger bg-danger-soft px-3 py-2 text-center text-xs font-semibold text-danger">
            {t("error_bag_storage_failed")}
          </p>
        </div>
      )}
    </Ctx.Provider>
  );
}

export function useBag() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useBag outside BagProvider");
  return v;
}
