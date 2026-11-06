/**
 * طبقة اللغة والمسارات — مشتركة بين الخادم والمتصفح.
 *
 * استراتيجية العناوين:
 *  • `/ar/...` و`/en/...` — عنوان مستقل لكل لغة (شرط `hreflang` و SEO).
 *  • `/` — إعادة توجيه إلى لغة المتصفح/الكوكي.
 *  • الباقي يعمل كما كان (بلا كسر للروابط القائمة).
 */

export type Lang = "ar" | "en";

export const LANGS: Lang[] = ["ar", "en"];
export const DEFAULT_LANG: Lang = "ar";
export const LANG_COOKIE = "arownd:lang";
export const LANG_HEADER = "x-arownd-lang";
const LEGACY_LANG_COOKIE = "sooqy:lang";
const LEGACY_LANG_HEADER = "x-sooqy-lang";

/** هل المسار يبدأ ببادئة لغة؟ */
export function parseLocalePrefix(pathname: string): { lang: Lang; rest: string } | null {
  const m = /^\/(ar|en)(?=\/|$)/.exec(pathname);
  if (!m) return null;
  const lang = m[1] as Lang;
  const rest = pathname.slice(m[0].length) || "/";
  return { lang, rest };
}

/** يبني مسارًا ببادئة اللغة. */
export function withLocalePrefix(lang: Lang, path: string): string {
  const clean = path === "/" ? "" : path.startsWith("/") ? path : `/${path}`;
  return `/${lang}${clean}`;
}

/** يستخرج اللغة من ترويسة `Accept-Language`. */
export function langFromAcceptLanguage(header: string | null | undefined): Lang | null {
  if (!header) return null;
  const entries = header
    .split(",")
    .map((part) => {
      const [tag, q] = part.trim().split(";q=");
      return { tag: tag.trim().toLowerCase(), q: q ? Number(q) : 1 };
    })
    .sort((a, b) => b.q - a.q);
  for (const { tag } of entries) {
    if (tag.startsWith("ar")) return "ar";
    if (tag.startsWith("en")) return "en";
  }
  return null;
}

/** يستخرج اللغة من نص كوكي. */
export function langFromCookie(cookieHeader: string | null | undefined): Lang | null {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name === LANG_COOKIE || name === LEGACY_LANG_COOKIE) {
      const value = decodeURIComponent(rest.join("="));
      if (value === "ar" || value === "en") return value;
    }
  }
  return null;
}

/**
 * يحدّد لغة الطلب: الكوكي أولًا (اختيار المستخدم)، ثم `Accept-Language`،
 * ثم اللغة الافتراضية (العربية — السوق الأساسي).
 */
export function detectLang(options: {
  cookie?: string | null;
  acceptLanguage?: string | null;
  header?: string | null;
}): Lang {
  return (
    langFromCookie(options.cookie) ??
    (options.header === "ar" || options.header === "en" ? options.header : null) ??
    langFromAcceptLanguage(options.acceptLanguage) ??
    DEFAULT_LANG
  );
}

/** ترويسة `Set-Cookie` لحفظ اللغة. */
export function localeCookieHeader(lang: Lang): string {
  const maxAge = 60 * 60 * 24 * 365; // سنة
  return `${LANG_COOKIE}=${lang}; Path=/; Max-Age=${maxAge}; SameSite=Lax`;
}
