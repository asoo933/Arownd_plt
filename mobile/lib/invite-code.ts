const LEGACY_INVITE_CODE_PATTERN = /^[A-F0-9]{16}$/;
const INVITE_CODE_PATTERN = /^[2-9A-H]{12}$/;

export function normalizeInviteCode(value: string): string | null {
  const normalized = value
    .trim()
    .toUpperCase()
    .replace(/^ARW[-\s]?/, "")
    .replace(/[\s-]/g, "");

  return LEGACY_INVITE_CODE_PATTERN.test(normalized) || INVITE_CODE_PATTERN.test(normalized)
    ? normalized
    : null;
}

export function formatInviteCode(value: string): string {
  const normalized = normalizeInviteCode(value);
  if (!normalized) return value;
  const groups = normalized.match(/.{1,4}/g) ?? [normalized];
  return `ARW-${groups.join("-")}`;
}
