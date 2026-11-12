import AsyncStorage from "@react-native-async-storage/async-storage";

const PENDING_INVITE_CODE_KEY = "arownd:pending-invite-code";
const INVITE_CODE_PATTERN = /^[A-F0-9]{16}$/;

export async function savePendingInviteCode(value: string | string[] | undefined): Promise<void> {
  const candidate = Array.isArray(value) ? value[0] : value;
  const normalizedCode = candidate?.trim().toUpperCase();

  if (!normalizedCode || !INVITE_CODE_PATTERN.test(normalizedCode)) {
    await AsyncStorage.removeItem(PENDING_INVITE_CODE_KEY);
    return;
  }

  await AsyncStorage.setItem(PENDING_INVITE_CODE_KEY, normalizedCode);
}

export async function getPendingInviteCode(): Promise<string | null> {
  const storedCode = await AsyncStorage.getItem(PENDING_INVITE_CODE_KEY);
  if (!storedCode) return null;

  const normalizedCode = storedCode.trim().toUpperCase();
  if (!INVITE_CODE_PATTERN.test(normalizedCode)) {
    await AsyncStorage.removeItem(PENDING_INVITE_CODE_KEY);
    return null;
  }

  return normalizedCode;
}

export async function clearPendingInviteCode(): Promise<void> {
  await AsyncStorage.removeItem(PENDING_INVITE_CODE_KEY);
}
