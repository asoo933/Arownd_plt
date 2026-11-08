export function normalizeOtp(value: string, length: number): string {
  const westernDigits = value.replace(/[٠-٩۰-۹]/g, (digit) => {
    const code = digit.charCodeAt(0);
    return String(code >= 0x06f0 ? code - 0x06f0 : code - 0x0660);
  });
  return westernDigits.replace(/\D/g, "").slice(0, Math.max(0, length));
}

export function getCalendarDays(year: number, month: number, weekStartsOn = 0): Array<number | null> {
  const firstWeekday = new Date(year, month, 1).getDay();
  const leading = (firstWeekday - weekStartsOn + 7) % 7;
  const dayCount = new Date(year, month + 1, 0).getDate();
  return [
    ...Array.from({ length: leading }, () => null),
    ...Array.from({ length: dayCount }, (_, index) => index + 1)
  ];
}
