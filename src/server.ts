import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";
import {
  detectLang,
  localeCookieHeader,
  parseLocalePrefix,
  withLocalePrefix,
  type Lang,
} from "./lib/locale";
import { currentLocale, runWithLocale } from "./lib/locale.server";
import { registerServerLangResolver } from "./lib/i18n";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// لغة الطلب تُقرأ من `AsyncLocalStorage` — مرتبطة بالطلب، فلا تتعارض الطلبات.
registerServerLangResolver(() => {
  const value = currentLocale()?.lang;
  return value === "ar" || value === "en" ? value : null;
});

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isH3SwallowedErrorBody(body)) return response;

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isH3SwallowedErrorBody(body: string): boolean {
  try {
    const payload = JSON.parse(body) as { unhandled?: unknown; message?: unknown };
    return payload.unhandled === true && payload.message === "HTTPError";
  } catch {
    return false;
  }
}

/** لغة الطلب: بادئة المسار أولًا، ثم الكوكي، ثم `Accept-Language`. */
function detectRequestLang(request: Request): Lang {
  const url = new URL(request.url);
  const prefixed = parseLocalePrefix(url.pathname);
  if (prefixed) return prefixed.lang;
  return detectLang({
    cookie: request.headers.get("cookie"),
    acceptLanguage: request.headers.get("accept-language"),
  });
}

/**
 * يحوّل `/ar/explore` إلى `/explore` مع تمرير اللغة عبر `AsyncLocalStorage`،
 * ويحفظها في كوكي حتى تذكرها الزيارات التالية.
 */
function applyLocale(request: Request): { request: Request; lang: Lang; redirect: boolean } {
  const url = new URL(request.url);
  const prefixed = parseLocalePrefix(url.pathname);

  if (!prefixed) {
    // `/` → إعادة توجيه إلى نسخة اللغة.
    if (url.pathname === "/") {
      const lang = detectRequestLang(request);
      const target = new URL(withLocalePrefix(lang, "/"), url.origin);
      target.search = url.search; // نحافظ على سلسلة الاستعلام
      return {
        request: new Request(target.toString(), {
          method: request.method,
          headers: request.headers,
          redirect: "manual",
        }),
        lang,
        redirect: true,
      };
    }
    return { request, lang: detectRequestLang(request), redirect: false };
  }

  const { lang, rest } = prefixed;
  const target = new URL(url.toString());
  target.pathname = rest;
  return {
    request: new Request(target.toString(), {
      method: request.method,
      headers: request.headers,
      redirect: request.redirect,
    }),
    lang,
    redirect: false,
  };
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      const { request: localized, lang, redirect } = applyLocale(request);

      // طلب `/` بعد إعادة التوجيه — نُعيد التوجيه بدل معالجته.
      if (redirect) {
        return new Response(null, {
          status: 307,
          headers: {
            location: localized.url,
            "set-cookie": localeCookieHeader(lang),
            "cache-control": "no-store",
          },
        });
      }

      const handler = await getServerEntry();
      const response = await runWithLocale({ lang }, () => handler.fetch(localized, env, ctx));
      const normalized = await normalizeCatastrophicSsrResponse(response);

      // نحفظ اللغة في كوكي عند وجود بادئة في المسار فقط (لا نطمس اختيار المستخدم).
      if (parseLocalePrefix(new URL(request.url).pathname)) {
        const headers = new Headers(normalized.headers);
        headers.append("set-cookie", localeCookieHeader(lang));
        headers.set("vary", "accept-language, cookie");
        return new Response(normalized.body, {
          status: normalized.status,
          statusText: normalized.statusText,
          headers,
        });
      }

      return normalized;
    } catch (error) {
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};
