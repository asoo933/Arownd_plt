/**
 * روابط الاتصال: رقم محلي (0550…) أو دولي (+213…) → رابط صالح، أو null إن لم يصلح.
 * wa.me يتطلب الصيغة الدولية بلا صفر بادئ ولا +؛ الرقم المحلي المُمرَّر كما هو يفتح محادثة خاطئة.
 */
const DEFAULT_COUNTRY_CODE = "213";

export function toInternationalDigits(
  raw: string | null | undefined,
  countryCode = DEFAULT_COUNTRY_CODE,
): string | null {
  const digits = (raw ?? "").replace(/\D/g, "");
  if (digits.length < 8) return null;
  if (digits.startsWith("00")) return digits.slice(2);
  if (digits.startsWith("0")) return countryCode + digits.slice(1);
  if (digits.startsWith(countryCode)) return digits;
  return digits.length <= 9 ? countryCode + digits : digits;
}

export function whatsappUrl(raw: string | null | undefined, text?: string): string | null {
  const intl = toInternationalDigits(raw);
  if (!intl) return null;
  return `https://wa.me/${intl}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}

export function telUrl(raw: string | null | undefined): string | null {
  const cleaned = (raw ?? "").replace(/[^\d+]/g, "");
  return cleaned.replace(/\D/g, "").length >= 8 ? `tel:${cleaned}` : null;
}
