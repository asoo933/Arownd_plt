import { useSyncExternalStore } from "react";

/**
 * المفضلة — تحفظ معرفات المنتجات والمتاجر محليًا فقط (localStorage).
 * البيانات المعروضة تُجلب حقيقية من قاعدة البيانات عند العرض.
 */
const KEY = "arownd:favorites";
const LEGACY_KEY = "sooqy:favorites";

type Fav = { products: string[]; stores: string[] };

function read(): Fav {
  if (typeof window === "undefined") return { products: [], stores: [] };
  try {
    const raw = window.localStorage.getItem(KEY) ?? window.localStorage.getItem(LEGACY_KEY);
    if (!raw) return { products: [], stores: [] };
    const parsed = JSON.parse(raw) as Partial<Fav>;
    const favorites = {
      products: Array.isArray(parsed.products) ? parsed.products : [],
      stores: Array.isArray(parsed.stores) ? parsed.stores : [],
    };
    if (!window.localStorage.getItem(KEY)) {
      window.localStorage.setItem(KEY, JSON.stringify(favorites));
    }
    return favorites;
  } catch {
    return { products: [], stores: [] };
  }
}

const listeners = new Set<() => void>();
let cache: Fav = read();

function emit() {
  cache = read();
  listeners.forEach((l) => l());
}

function write(next: Fav) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* تجاهل */
  }
  emit();
}

export function toggleFavorite(kind: "products" | "stores", id: string): boolean {
  const fav = read();
  const list = fav[kind];
  const has = list.includes(id);
  write({ ...fav, [kind]: has ? list.filter((x) => x !== id) : [...list, id] });
  return !has;
}

export function isFavorite(kind: "products" | "stores", id: string): boolean {
  return cache[kind].includes(id);
}

export function getFavorites(): Fav {
  return cache;
}

/** لقطة ثابتة تُستخدم على الخادم — يجب أن تكون نفس المرجع دائمًا
 *  وإلا دخل React في حلقة إعادة تصيير لا نهائية أثناء SSR. */
const EMPTY: Fav = { products: [], stores: [] };

export function useFavorites(): Fav {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => {
        listeners.delete(cb);
      };
    },
    () => cache,
    () => EMPTY,
  );
}
