import AsyncStorage from "@react-native-async-storage/async-storage";

const PENDING_INVITE_CODE_KEY = "arownd:pending-invite-code";
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

export async function savePendingInviteCode(value: string | string[] | undefined): Promise<void> {
  const candidate = Array.isArray(value) ? value[0] : value;
  const normalizedCode = candidate ? normalizeInviteCode(candidate) : null;

  if (!normalizedCode) {
    await AsyncStorage.removeItem(PENDING_INVITE_CODE_KEY);
    return;
  }

  await AsyncStorage.setItem(PENDING_INVITE_CODE_KEY, normalizedCode);
}

export async function getPendingInviteCode(): Promise<string | null> {
  const storedCode = await AsyncStorage.getItem(PENDING_INVITE_CODE_KEY);
  if (!storedCode) return null;

  const normalizedCode = normalizeInviteCode(storedCode);
  if (!normalizedCode) {
    await AsyncStorage.removeItem(PENDING_INVITE_CODE_KEY);
    return null;
  }

  return normalizedCode;
}

export async function clearPendingInviteCode(): Promise<void> {
  await AsyncStorage.removeItem(PENDING_INVITE_CODE_KEY);
}
