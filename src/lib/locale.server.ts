import { AsyncLocalStorage } from "node:async_hooks";

/**
 * طلب واحد = سياق واحد.
 *
 * `AsyncLocalStorage` يجعل قيمة (اللغة) متاحة لكل الكود الذي ينفَّذ ضمن
 * نطاق `handler.fetch(...)` — بما فيه.render — دون تعارض بين الطلبات المتوازية.
 *
 * هذا الملف يُستورد من الخادم فقط (`src/server.ts`).
 */
export type RequestLocale = { lang: string };

const storage = new AsyncLocalStorage<RequestLocale>();

/** ينفّذ `fn` ضمن سياق طلب يحمل اللغة. */
export function runWithLocale<T>(locale: RequestLocale, fn: () => T): T {
  return storage.run(locale, fn);
}

/** يقرأ لغة الطلب الحالي (أو null خارج نطاق الطلب). */
export function currentLocale(): RequestLocale | null {
  return storage.getStore() ?? null;
}
