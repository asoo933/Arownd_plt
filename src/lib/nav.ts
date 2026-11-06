/**
 * رجوع آمن: إن وُجد سجل تصفح نعود خطوة، وإلا (رابط مباشر من مشاركة/إشعار)
 * ننتقل إلى مسار بديل بدل زر لا يفعل شيئًا.
 */
interface BackCapableRouter {
  history: { back: () => void };
  navigate(opts: { to: string }): unknown;
}

export function goBackOrTo(router: BackCapableRouter, fallback = "/") {
  if (typeof window !== "undefined" && window.history.length > 1) router.history.back();
  else void router.navigate({ to: fallback });
}
