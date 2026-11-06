import { registerPlugin } from "@capacitor/core";
import { isAndroidNativePlatform } from "@/lib/platform";

export interface NativeBiometricStatus {
  available: boolean;
  enabled: boolean;
  reason: string;
}

interface NativeBiometricPlugin {
  getStatus(): Promise<NativeBiometricStatus>;
  setEnabled(options: { enabled: boolean }): Promise<void>;
  authenticate(): Promise<{ success: boolean; enabled: boolean }>;
}

const NativeBiometric = registerPlugin<NativeBiometricPlugin>("ArowndBiometric");

export async function getNativeBiometricStatus(): Promise<NativeBiometricStatus> {
  if (!isAndroidNativePlatform()) return { available: false, enabled: false, reason: "not_android" };
  return NativeBiometric.getStatus();
}

export async function setNativeBiometricEnabled(enabled: boolean): Promise<void> {
  if (!isAndroidNativePlatform()) throw new Error("Biometric lock is only available on Android");
  await NativeBiometric.setEnabled({ enabled });
}

export async function authenticateNativeBiometric(): Promise<void> {
  if (!isAndroidNativePlatform()) throw new Error("Biometric authentication is only available on Android");
  await NativeBiometric.authenticate();
}
