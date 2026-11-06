/**
 * Service Worker — Arownd
 *
 * الخصوصية:
 * - لا نخزّن استجابات API أو Supabase أو أي استجابة صفحة HTML.
 * - الصفحة الوحيدة المتاحة دون اتصال ثابتة وعامة ولا تتضمن بيانات حساب.
 * - ملفات التطبيق المجمّعة والأصول العامة فقط قابلة للتخزين.
 * - تتغير مساحة الكاش تلقائيًا مع كل build عبر معرّف الإصدار في URL.
 */

const VERSION =
  new URL(self.location.href).searchParams.get("build")?.replace(/[^a-zA-Z0-9._-]/g, "").slice(0, 64) ||
  "dev";
const SHELL_CACHE = `arownd-shell-${VERSION}`;
const ASSET_CACHE = `arownd-assets-${VERSION}`;
const MAX_ASSETS = 80;

const SHELL_ASSETS = [
  "/offline.html",
  "/manifest.webmanifest",
  "/pwa-icon.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL_CACHE);
      await Promise.allSettled(SHELL_ASSETS.map((url) => cache.add(url)));
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keep = new Set([SHELL_CACHE, ASSET_CACHE]);
      const names = await caches.keys();
      await Promise.all(
        names
          .filter((name) => name.startsWith("arownd-") && !keep.has(name))
          .map((name) => caches.delete(name)),
      );
      await self.clients.claim();
    })(),
  );
});

async function clearLegacyUserCaches() {
  const names = await caches.keys();
  await Promise.all(
    names
      .filter((name) => name.startsWith("arownd-data-"))
      .map((name) => caches.delete(name)),
  );
}

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") {
    self.skipWaiting();
    return;
  }

  // Keep the old message name supported while older tabs/workers are replaced.
  if (event.data === "CLEAR_USER_DATA" || event.data === "CLEAR_DATA_CACHE") {
    event.waitUntil(clearLegacyUserCaches());
  }
});

async function trimCache(cacheName, max) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length <= max) return;

  await Promise.all(keys.slice(0, keys.length - max).map((key) => cache.delete(key)));
}

function isPublicAsset(url) {
  return url.pathname.startsWith("/_build/") || url.pathname.startsWith("/assets/");
}

function isPublicCacheResponse(response) {
  if (!response.ok || response.type === "opaque") return false;
  const cacheControl = response.headers.get("Cache-Control") ?? "";
  return !/private|no-store|no-cache/i.test(cacheControl);
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Never intercept requests carrying explicit credentials or opting out of caching.
  if (request.headers.has("authorization") || request.cache === "no-store") return;

  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          // HTML may contain user-specific SSR state: always use the network and never cache it.
          return await fetch(request);
        } catch {
          return (
            (await caches.match("/offline.html")) ||
            new Response("الاتصال بالإنترنت غير متاح. أعد الاتصال وحاول مجددًا.", {
              status: 503,
              headers: { "Content-Type": "text/plain; charset=utf-8" },
            })
          );
        }
      })(),
    );
    return;
  }

  if (!isPublicAsset(url)) return;

  event.respondWith(
    (async () => {
      const cache = await caches.open(ASSET_CACHE);
      const cached = await cache.match(request);
      const network = fetch(request)
        .then((response) => {
          if (isPublicCacheResponse(response)) {
            void cache.put(request, response.clone());
            void trimCache(ASSET_CACHE, MAX_ASSETS);
          }
          return response;
        })
        .catch(() => undefined);

      return cached || (await network) || new Response("", { status: 504 });
    })(),
  );
});

self.addEventListener("sync", (event) => {
  if (event.tag === "arownd-sync") {
    event.waitUntil(
      (async () => {
        const clients = await self.clients.matchAll({ type: "window" });
        clients.forEach((client) => client.postMessage({ type: "SYNC_COMPLETE" }));
      })(),
    );
  }
});
