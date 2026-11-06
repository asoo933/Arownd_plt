import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { parseLocalePrefix } from "@/lib/locale";

/**
 * على المتصفح: المسار قد يأتي ببادئة لغة (`/en/explore`).
 * الخادم يزيل البادهة ويقدّم الصفحة، فنزيلها في المتصفح أيضًا قبل إنشاء
 * الراوتر حتى يتطابق الشجرة مع HTML المُرسل من الخادم (بلا تعارض hydration).
 * اللغة نفسها تصل عبر كوكي `sooqy:lang` الذي يضعه الخادم.
 */
function normalizeClientPath() {
  if (typeof window === "undefined") return;
  const prefix = parseLocalePrefix(window.location.pathname);
  if (!prefix) return;
  const next = `${prefix.rest}${window.location.search}${window.location.hash}`;
  window.history.replaceState(window.history.state, "", next);
}

export const getRouter = () => {
  normalizeClientPath();

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000, // البيانات تبقى "طازجة" دقيقة كاملة
        gcTime: 10 * 60_000, // تُحفظ في الذاكرة 10 دقائق
        retry: 2,
        refetchOnWindowFocus: false, // لا نعيد الجلب عند كل تركيز على النافذة
      },
    },
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    // تغيير الصفحة = قفزة فورية للأعلى (لا تمرير ناعم) لأن الصفحة تُعاد بناؤها مع حركة fade-up
    scrollRestorationBehavior: "instant",
    defaultPreload: "intent", // تحميل مسبق عند التمرير على الروابط (hover)
    defaultPreloadStaleTime: 0,
  });

  return router;
};
