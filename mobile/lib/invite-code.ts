const INVITE_CODE_PATTERN = /^AR-INVITE-[A-Z]{2}-[0-9]{4}$/;

export function normalizeInviteCode(value: string): string | null {
  const normalized = value.trim().toUpperCase();
  return INVITE_CODE_PATTERN.test(normalized) ? normalized : null;
}

export function formatInviteCode(value: string): string {
  return normalizeInviteCode(value) ?? value;
}
