import { useLocation } from "@tanstack/react-router";
import { ENGLISH_ENABLED, useTranslation } from "@/lib/i18n";

export interface SeoHeadProps {
  title?: string;
  description?: string;
  canonical?: string;
  ogImage?: string;
  ogType?: "website" | "article" | "product";
  keywords?: string;
  noindex?: boolean;
  jsonLd?: Record<string, unknown> | Array<Record<string, unknown>>;
  /**
   * المسار البديل لكل لغة (بدون بادئة) — يُستخدم لبناء `hreflang`.
   * مثال: `alternates={{ ar: "/explore", en: "/explore" }}` → `/ar/explore` و`/en/explore`.
   */
  alternates?: Record<"ar" | "en", string>;
}

const SITE_NAME = "Arownd";
const DEFAULT_DESC = "Arownd — اكتشف ما حولك. منتجات، متاجر، تصنيفات، طلب وتتبع.";
const DEFAULT_OG = "/seo/og.svg";
const BASE = "https://arownd.vercel.app";

/** لغة Open Graph حسب اللغة النشطة. */
const OG_LOCALE: Record<"ar" | "en", string> = { ar: "ar_DZ", en: "en_DZ" };
/** بديل `x-default` يشير إلى النسخة العربية (السوق الأساسي). */
const DEFAULT_ALT = "ar";

function toAbsolute(base: string, path?: string) {
  if (!path) return undefined;
  try {
    const u = new URL(path, base);
    return u.toString();
  } catch {
    return path;
  }
}

export function SeoHead({
  title,
  description = DEFAULT_DESC,
  canonical,
  ogImage = DEFAULT_OG,
  ogType = "website",
  keywords,
  noindex = false,
  jsonLd,
  alternates,
}: SeoHeadProps) {
  const { lang } = useTranslation();
  // المسار من الراوتر — متاح أثناء SSR أيضًا (مهم للـ canonical و hreflang).
  const location = useLocation();
  // Canonical URLs must not vary with tracking, filter, or pagination query strings.
  const path = location.pathname;

  const fullTitle = title ? `${title} | ${SITE_NAME}` : SITE_NAME;
  // الرابط المعياري يتضمّن بادئة اللغة — عنوان مستقل لكل لغة في فهرس البحث.
  const cleanPath = path.replace(/^\/(ar|en)(?=\/|$)/, "") || "/";
  const localePath = `/${lang}${cleanPath === "/" ? "" : cleanPath}`;
  const url = canonical ? toAbsolute(BASE, canonical) : toAbsolute(BASE, localePath) || BASE;
  const ogImgAbs = toAbsolute(BASE, ogImage) || BASE + DEFAULT_OG;

  // بدائل اللغة: نفس المسار ببادئة اللغة + `x-default`.
  // تُشتق من المسار الحالي تلقائيًا ما لم تُمرَّر صراحةً.
  const altSource = alternates ?? { ar: cleanPath, en: cleanPath };
  const altLinks = (["ar", "en"] as const)
    .filter((code) => ENGLISH_ENABLED || code === "ar")
    .map((code) => {
      const target = altSource[code];
      if (!target) return null;
      const href = toAbsolute(BASE, `/${code}${target === "/" ? "" : target}`);
      return href ? { hreflang: code, href } : null;
    })
    .filter(Boolean) as { hreflang: "ar" | "en"; href: string }[];

  const defaultTarget = altSource[DEFAULT_ALT];
  const defaultAlt = defaultTarget
    ? toAbsolute(BASE, `/${DEFAULT_ALT}${defaultTarget === "/" ? "" : defaultTarget}`)
    : undefined;

  return (
    <>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      {keywords ? <meta name="keywords" content={keywords} /> : null}
      {url ? <link rel="canonical" href={url} /> : null}
      {altLinks.map((l) => (
        <link key={l.hreflang} rel="alternate" hrefLang={l.hreflang} href={l.href} />
      ))}
      {defaultAlt ? <link rel="alternate" hrefLang="x-default" href={defaultAlt} /> : null}
      {noindex ? (
        <meta name="robots" content="noindex,nofollow" />
      ) : (
        <meta
          name="robots"
          content="index,follow,max-snippet:-1,max-image-preview:large,max-video-preview:-1"
        />
      )}
      <meta property="og:locale" content={OG_LOCALE[lang]} />
      {ENGLISH_ENABLED ? (
        <meta property="og:locale:alternate" content={OG_LOCALE[lang === "ar" ? "en" : "ar"]} />
      ) : null}
      <meta property="og:type" content={ogType} />
      <meta property="og:site_name" content={SITE_NAME} />
      {fullTitle ? <meta property="og:title" content={fullTitle} /> : null}
      {description ? <meta property="og:description" content={description} /> : null}
      {url ? <meta property="og:url" content={url} /> : null}
      {ogImgAbs ? <meta property="og:image" content={ogImgAbs} /> : null}
      <meta name="twitter:card" content="summary_large_image" />
      {fullTitle ? <meta name="twitter:title" content={fullTitle} /> : null}
      {description ? <meta name="twitter:description" content={description} /> : null}
      {ogImgAbs ? <meta name="twitter:image" content={ogImgAbs} /> : null}
      {jsonLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
          }}
        />
      ) : null}
    </>
  );
}
