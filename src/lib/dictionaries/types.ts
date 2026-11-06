/** بنية مجموعة مفاتيح الترجمة — عربية وإنجليزية معًا (شرط التوازن). */
export type DictGroup = {
  ar: Record<string, string>;
  en: Record<string, string>;
};
