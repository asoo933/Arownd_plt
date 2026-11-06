import { formatDA } from "./geo";
import { t as translate, type Lang } from "./i18n";
import { stockLevel, type BagItem, type OfferFull } from "./sooqy";

/**
 * طبقة التحقق من السلة — **مصدر واحد للحقيقة** تستخدمه السلة والدفع معًا.
 *
 * الهدف: ألّا تظهر الواجهة كأن كل شيء سليم بينما العرض اختفى أو نفد مخزونه
 * أو تغيّر سعره. كل مشكلة لها `kind` و`message` و`blocking` موحّدة.
 */

export type BagIssueKind =
  "missing" | "unavailable" | "out_of_stock" | "over_stock" | "price_changed";

export type BagIssue = {
  kind: BagIssueKind;
  /** رسالة عربية جاهزة للعرض (تُترجم لاحقًا عبر طبقة i18n). */
  message: string;
  /** هل يمنع إتمام الطلب؟ */
  blocking: boolean;
};

export type EvaluatedBagRow = {
  item: BagItem;
  offer: OfferFull | null;
  /** أول مشكلة حاجبة — تُعرض كتنبيه بارز. */
  issue: BagIssue | null;
  /** كل المشكلات (قد توجد رسالة تحذير مع حاجبة). */
  issues: BagIssue[];
};

export type BagEvaluation = {
  rows: EvaluatedBagRow[];
  /** عدد العناصر التي تمنع إتمام الطلب. */
  blockingCount: number;
  /** هل هناك ما يمنع إتمام الطلب؟ */
  hasBlocking: boolean;
  /** المجموع الفرعي بالأسعار **الحالية** (لا لقطة السعر القديمة). */
  subtotal: number;
  /** هل اكتمل تحميل بيانات العروض؟ (حتى لا نُبلغ عن "مفقود" قبل التحميل) */
  loaded: boolean;
};

/** نص المشكلة — مُترجَم، ومعزول ليسهل التعديل. */
export function bagIssueMessage(
  kind: BagIssueKind,
  ctx: { stock?: number; quantity?: number; oldPrice?: number; newPrice?: number } = {},
  lang: Lang = "ar",
): string {
  switch (kind) {
    case "missing":
      return translate("bag_issue_missing", lang);
    case "unavailable":
      return translate("bag_issue_unavailable", lang);
    case "out_of_stock":
      return translate("bag_issue_out_of_stock", lang);
    case "over_stock":
      return translate("bag_issue_over_stock", lang, { stock: ctx.stock ?? 0 });
    case "price_changed":
      return translate("bag_issue_price_changed", lang, {
        oldPrice: formatDA(ctx.oldPrice ?? 0),
        newPrice: formatDA(ctx.newPrice ?? 0),
      });
  }
}

function issue(
  kind: BagIssueKind,
  blocking: boolean,
  ctx: { stock?: number; quantity?: number; oldPrice?: number; newPrice?: number } = {},
  lang: Lang = "ar",
): BagIssue {
  return { kind, blocking, message: bagIssueMessage(kind, ctx, lang) };
}

/**
 * يقيّم عناصر السلة مقابل بيانات العروض الحالية.
 *
 * @param items   عناصر السلة المحفوظة
 * @param offers  العروض الحالية من الخادم — `undefined` تعني «لم تُحمَّل بعد»
 */
export function evaluateBag(
  items: BagItem[],
  offers: OfferFull[] | undefined | null,
  lang: Lang = "ar",
): BagEvaluation {
  const loaded = offers != null;
  const list = offers ?? [];
  // Stock is tracked per store offer, not per selected size/color line.
  // Validate the combined demand across all variants of that same offer.
  const requestedByOffer = new Map<string, number>();
  for (const item of items) {
    requestedByOffer.set(
      item.offerId,
      (requestedByOffer.get(item.offerId) ?? 0) + item.quantity,
    );
  }

  const rows: EvaluatedBagRow[] = items.map((item) => {
    const offer = list.find((o) => o.id === item.offerId) ?? null;
    const issues: BagIssue[] = [];

    if (!offer) {
      // لا نُبلغ عن "مفقود" قبل اكتمال التحميل — قد يكون العرض لم يُجلب بعد.
      if (loaded) issues.push(issue("missing", true, {}, lang));
    } else {
      if (!offer.is_available) {
        issues.push(issue("unavailable", true, {}, lang));
      } else if (stockLevel(offer) === "out" || offer.stock_quantity <= 0) {
        issues.push(issue("out_of_stock", true, {}, lang));
      } else if (offer.stock_quantity < (requestedByOffer.get(item.offerId) ?? item.quantity)) {
        issues.push(
          issue(
            "over_stock",
            true,
            {
              stock: offer.stock_quantity,
              quantity: requestedByOffer.get(item.offerId) ?? item.quantity,
            },
            lang,
          ),
        );
      }

      // تغيّر السعر — تحذير غير حاجب (العميل يرى السعر الجديد قبل الدفع).
      if (item.price != null && offer.price !== item.price) {
        issues.push(
          issue("price_changed", false, { oldPrice: item.price, newPrice: offer.price }, lang),
        );
      }
    }

    return {
      item,
      offer,
      issues,
      issue: issues.find((i) => i.blocking) ?? null,
    };
  });

  const subtotal = rows.reduce((sum, r) => sum + (r.offer?.price ?? 0) * r.item.quantity, 0);
  const blockingCount = rows.filter((r) => r.issue).length;

  return { rows, blockingCount, hasBlocking: blockingCount > 0, subtotal, loaded };
}
