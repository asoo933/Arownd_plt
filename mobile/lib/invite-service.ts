import AsyncStorage from "@react-native-async-storage/async-storage";

import { normalizeInviteCode } from "@/lib/invite-code";

const PENDING_INVITE_CODE_KEY = "arownd:pending-invite-code";

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
