import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const PUBLIC_DIR = resolve(process.cwd(), "public");

function readManifest(file: string) {
  return JSON.parse(readFileSync(resolve(PUBLIC_DIR, file), "utf8")) as {
    name: string;
    short_name: string;
    start_url: string;
    scope: string;
    display: string;
    lang: string;
    dir: string;
    theme_color: string;
    background_color: string;
    icons: { src: string; sizes: string; type: string; purpose?: string }[];
    shortcuts?: { name: string; url: string }[];
  };
}

describe("PWA — الـ manifest", () => {
  const manifests = ["manifest.webmanifest"];

  for (const file of manifests) {
    describe(file, () => {
      const m = readManifest(file);

      it("JSON صالح ويحتوي الحقول الأساسية", () => {
        expect(m.name).toBeTruthy();
        expect(m.short_name).toBeTruthy();
        expect(m.start_url).toBe("/");
        expect(m.scope).toBe("/");
        expect(m.display).toBe("standalone");
        expect(m.lang).toBe("ar");
        expect(m.dir).toBe("rtl");
      });

      it("كل أيقونة مذكورة موجودة فعلًا على القرص", () => {
        for (const icon of m.icons) {
          const p = resolve(PUBLIC_DIR, icon.src.replace(/^\//, ""));
          expect(existsSync(p), `أيقونة مفقودة: ${icon.src}`).toBe(true);
        }
      });

      it("يحتوي أيقونات 192 و 512 (شرط التثبيت)", () => {
        const sizes = m.icons.map((i) => i.sizes);
        expect(sizes).toContain("192x192");
        expect(sizes).toContain("512x512");
      });

      it("يحتوي أيقونة maskable (للتثبيت على أندرويد)", () => {
        expect(m.icons.some((i) => i.purpose === "maskable")).toBe(true);
      });

      it("لون الواجهة يطابق هوية التطبيق", () => {
        // AROWND Design System v1.2: الخلفية الفاتحة #F5F5F5 والداكن #0A0A0A
        expect(m.background_color.toLowerCase()).toBe("#f5f5f5");
        expect(m.theme_color.toLowerCase()).toBe("#0a0a0a");
      });

      it("اختصارات التطبيق تشير إلى مسارات موجودة", () => {
        for (const s of m.shortcuts ?? []) {
          expect(s.url.startsWith("/")).toBe(true);
        }
      });
    });
  }

});

describe("PWA — Service Worker", () => {
  const sw = readFileSync(resolve(PUBLIC_DIR, "sw.js"), "utf8");
  const pwaClient = readFileSync(resolve(process.cwd(), "src/lib/pwa.ts"), "utf8");

  it("موجود ويdefined", () => {
    expect(existsSync(resolve(PUBLIC_DIR, "sw.js"))).toBe(true);
    expect(sw.length).toBeGreaterThan(500);
  });


  it("يخزّن أيقونة التطبيق الموجودة بدل مراجع PNG غير الموجودة", () => {
    expect(existsSync(resolve(PUBLIC_DIR, "pwa-icon.svg"))).toBe(true);
    expect(sw).toContain('"/pwa-icon.svg"');
    expect(sw).not.toContain('"/icon-192.png"');
    expect(sw).not.toContain('"/icon-512.png"');
  });

  it("يسجّل Service Worker مرة واحدة حتى مع استدعاء التسجيل المتكرر", () => {
    expect(pwaClient).toContain("let serviceWorkerRegistrationStarted = false;");
    expect(pwaClient).toContain("serviceWorkerRegistrationStarted) return;");
    expect(pwaClient).toContain("serviceWorkerRegistrationStarted = true;");
  });

  it("لا يفوّت التسجيل إذا بدأ بعد حدث load", () => {
    expect(pwaClient).toContain('document.readyState === "complete"');
    expect(pwaClient).toContain('window.addEventListener("load", register, { once: true })');
  });

  it("يسجّل أحداث install/activate/fetch", () => {
    expect(sw).toContain('addEventListener("install"');
    expect(sw).toContain('addEventListener("activate"');
    expect(sw).toContain('addEventListener("fetch"');
  });

  it("يجلب صفحات التنقّل من الشبكة ويستخدم صفحة عامة عند انقطاعها", () => {
    expect(sw).toContain('request.mode === "navigate"');
    expect(sw).toContain('caches.match("/offline.html")');
    expect(sw).not.toContain('caches.match("/")');
  });

  it("لا يخزّن استجابات API أو Supabase", () => {
    expect(sw).not.toContain("const DATA_CACHE =");
    expect(sw).not.toContain("DATA_TTL_MS");
    expect(sw).not.toContain("X-Arownd-Cached-At");
    expect(sw).not.toContain('url.pathname.includes("/rest/v1/")');
    expect(sw).toContain('if (!isPublicAsset(url)) return;');
  });

  it("لا يخزّن صفحات التنقل التي قد تحتوي بيانات SSR خاصة", () => {
    expect(sw).toContain("HTML may contain user-specific SSR state");
    expect(sw).toContain('caches.match("/offline.html")');
    expect(sw).not.toContain('cache.put("/", fresh.clone())');
    expect(sw).toContain('"/offline.html"');
  });

  it("يستخدم build ID لتدوير مساحة الكاش تلقائيًا", () => {
    expect(sw).toContain('searchParams.get("build")');
    expect(pwaClient).toContain('__AROWND_BUILD_ID__');
    expect(pwaClient).toContain('searchParams.set("build", __AROWND_BUILD_ID__)');
  });

  it("يمسح كاش البيانات القديمة عند تسجيل الخروج", () => {
    expect(sw).toContain('event.data === "CLEAR_USER_DATA"');
    expect(sw).toContain('name.startsWith("arownd-data-")');
    expect(pwaClient).toContain('worker.postMessage("CLEAR_USER_DATA")');
    expect(pwaClient).toContain('worker.postMessage("CLEAR_DATA_CACHE")');
  });

  it("يحذف الكاش القديم عند التفعيل", () => {
    expect(sw).toContain("caches.delete");
  });
});
