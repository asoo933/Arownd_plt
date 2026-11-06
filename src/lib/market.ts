/**
 * طبقة السوق — **مصدر واحد** للعملة واللغة والتوقيت والاتجاه.
 *
 * الهدف: توسّع Arownd إلى سوق جديد دون تعديل مخطط قاعدة البيانات أو
 * إعادة كتابة الواجهة. كل ما يعرضmoney أو تاريخًا أو وقتًا يمرّ من هنا.
 *
 * - `formatMoney` / `formatDate` / `formatNumber` — بديل موحّد لكل التنسيق.
 * - `zonedParts` — يقرأ تاريخ/وقت السوق الحقيقي (لا إزاحة ثابتة +1).
 * - السوق النشط محفوظ محليًا ويُبثّ عبر حدث `arownd:market`.
 */

export type MarketLang = "ar" | "en";
export type MarketDir = "rtl" | "ltr";

export type Market = {
  id: string;
  lang: MarketLang;
  /** رمز العملة ISO 4217. */
  currency: string;
  /** رمز العملة المعروض للمستخدم. */
  currencySymbol: string;
  /** لغة العرض (BCP 47). */
  locale: string;
  /** لغة تنسيق الأرقام — الجزائر تستخدم النمط الفرنسي (فاصلة عشرية). */
  numberLocale: string;
  /** المنطقة الزمنية IANA — أساس كل حساب لساعات العمل. */
  timeZone: string;
  dir: MarketDir;
  label: string;
  /** المركز الافتراضي عند عدم توفر GPS. */
  defaultCenter: { lat: number; lng: number };
};

export const MARKETS: Market[] = [
  {
    id: "dz",
    lang: "ar",
    currency: "DZD",
    currencySymbol: "دج",
    locale: "ar-DZ",
    numberLocale: "fr-DZ",
    timeZone: "Africa/Algiers",
    dir: "rtl",
    label: "الجزائر",
    defaultCenter: { lat: 36.7538, lng: 3.0588 },
  },
  {
    id: "dz-en",
    lang: "en",
    currency: "DZD",
    currencySymbol: "DZD",
    locale: "en-DZ",
    numberLocale: "en-DZ",
    timeZone: "Africa/Algiers",
    dir: "ltr",
    label: "Algeria",
    defaultCenter: { lat: 36.7538, lng: 3.0588 },
  },
];

export const DEFAULT_MARKET: Market = MARKETS[0]!;

const STORAGE_KEY = "arownd:market";
const LEGACY_STORAGE_KEY = "sooqy:market";
const MARKET_EVENT = "arownd:market";

let cached: Market | null = null;

function readStoredId(): string | null {
  try {
    const current = localStorage.getItem(STORAGE_KEY);
    if (current) return current;
    const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (legacy) localStorage.setItem(STORAGE_KEY, legacy);
    return legacy;
  } catch {
    return null;
  }
}

/** السوق النشط. يُمرَّر `id` لتحديد سوق بعينه (مفيد للاختبار). */
export function getMarket(id?: string | null): Market {
  if (id) return MARKETS.find((m) => m.id === id) ?? DEFAULT_MARKET;
  if (!cached) {
    const stored = readStoredId();
    cached = MARKETS.find((m) => m.id === stored) ?? DEFAULT_MARKET;
  }
  return cached;
}

/** يبدّل السوق النشط ويحفظه محليًا. */
export function setMarket(id: string): Market {
  const next = MARKETS.find((m) => m.id === id) ?? DEFAULT_MARKET;
  cached = next;
  try {
    localStorage.setItem(STORAGE_KEY, next.id);
  } catch {
    /* تجاهل — التخزين غير متاح */
  }
  try {
    window.dispatchEvent(new CustomEvent(MARKET_EVENT, { detail: next.id }));
  } catch {
    /* تجاهل */
  }
  return next;
}

/** يُستدعى عند إقلاع التطبيق للتأكد من أن النسخة المخزّنة صالحة. */
export function initMarket(): Market {
  const stored = readStoredId();
  cached = MARKETS.find((m) => m.id === stored) ?? DEFAULT_MARKET;
  return cached;
}

// ---------- التنسيق ----------

/** تنسيق مبلغ حسب السوق — «2 500 دج» / «2,500 DZD». */
export function formatMoney(n: number, market: Market = getMarket()): string {
  const value = Number.isFinite(n) ? n : 0;
  return `${value.toLocaleString(market.numberLocale)} ${market.currencySymbol}`;
}

/** تنسيق عدد بلا رمز عملة. */
export function formatNumber(n: number, market: Market = getMarket()): string {
  const value = Number.isFinite(n) ? n : 0;
  return value.toLocaleString(market.numberLocale);
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function toDate(value: Date | string | number): Date {
  if (value instanceof Date) return value;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? new Date() : d;
}

/**
 * تاريخ بتوقيت السوق.
 * العربية: `15/03/2026` (يوم/شهر/سنة — العرف الجزائري، وبأرقام لاتينية).
 * الإنجليزية: `March 15, 2026`.
 */
export function formatDate(
  value: Date | string | number,
  market: Market = getMarket(),
  opts?: Intl.DateTimeFormatOptions,
): string {
  const d = toDate(value);
  if (opts) {
    return new Intl.DateTimeFormat(market.locale, {
      timeZone: market.timeZone,
      ...opts,
    }).format(d);
  }
  if (market.lang === "ar") {
    const z = zonedParts(d, market.timeZone);
    return `${pad2(z.day)}/${pad2(z.month)}/${z.year}`;
  }
  return new Intl.DateTimeFormat(market.locale, {
    timeZone: market.timeZone,
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(d);
}

/** وقت بتوقيت السوق — «14:30». */
export function formatTime(value: Date | string | number, market: Market = getMarket()): string {
  const d = toDate(value);
  const z = zonedParts(d, market.timeZone);
  return `${pad2(z.hour)}:${pad2(z.minute)}`;
}

/** تاريخ ووقت معًا. */
export function formatDateTime(
  value: Date | string | number,
  market: Market = getMarket(),
): string {
  return `${formatDate(value, market)} — ${formatTime(value, market)}`;
}

// ---------- المنطقة الزمنية ----------

export type ZonedParts = {
  year: number;
  month: number; // 1-12
  day: number;
  hour: number; // 0-23
  minute: number;
  /** 0 = الأحد … 6 = السبت (مطابق لـ Date.getDay) */
  weekday: number;
};

/**
 * يقرأ تاريخ/وقت لحظة معيّنة بتوقيت سوق معيّن.
 *
 * هذا هو البديل الصحيح عن الإزاحة الثابتة `UTC+1`: احسب التوقيت الحقيقي
 * للسوق عبر `Intl`، فتصحّ ساعات العمل والورديات مهما كان مكان الجهاز.
 */
export function zonedParts(date: Date, timeZone: string): ZonedParts {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
  const parts = dtf.formatToParts(date);
  const get = (type: string): number => {
    const found = parts.find((p) => p.type === type)?.value;
    return found ? Number(found) : 0;
  };
  const year = get("year");
  const month = get("month");
  const day = get("day");
  // بعض إصدارات ICU تُخرج 24 بدل 00 لمنتصف الليل.
  const rawHour = get("hour");
  const hour = rawHour === 24 ? 0 : rawHour;
  const minute = get("minute");
  // يوم الأسبوع من التاريخ المُعاد بناؤه بتوقيت UTC — بلا اعتماد على لغة النظام.
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return { year, month, day, hour, minute, weekday };
}

/** الوقت الحالي بتوقيت السوق. */
export function marketNow(market: Market = getMarket()): ZonedParts {
  return zonedParts(new Date(), market.timeZone);
}
