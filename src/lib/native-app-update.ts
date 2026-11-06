import { registerPlugin, type PluginListenerHandle } from "@capacitor/core";
import { isAndroidNativePlatform } from "@/lib/platform";

export interface NativeAppUpdateStatus {
  available: boolean;
  inProgress: boolean;
  priority: number;
  immediateAllowed: boolean;
  flexibleAllowed: boolean;
  downloaded: boolean;
  installStatus: number;
  updateAvailability: number;
}

export interface NativeAppUpdateStartResult {
  started: boolean;
  accepted: boolean;
  type: string;
}

export interface NativeAppUpdateState {
  installStatus: number;
  downloaded: boolean;
  bytesDownloaded: number;
  totalBytesToDownload: number;
}

interface NativeAppUpdatePlugin {
  checkForUpdate(): Promise<NativeAppUpdateStatus>;
  startUpdate(options: { type: "immediate" | "flexible" }): Promise<NativeAppUpdateStartResult>;
  completeUpdate(): Promise<void>;
  addListener(
    eventName: "installStateChange",
    listenerFunc: (state: NativeAppUpdateState) => void,
  ): Promise<PluginListenerHandle>;
}

const NativeAppUpdate = registerPlugin<NativeAppUpdatePlugin>("ArowndAppUpdate");

export async function checkNativeAppUpdate(): Promise<NativeAppUpdateStatus> {
  if (!isAndroidNativePlatform()) throw new Error("Native updates are only available on Android");
  return NativeAppUpdate.checkForUpdate();
}

export async function startNativeAppUpdate(
  type: "immediate" | "flexible",
): Promise<NativeAppUpdateStartResult> {
  if (!isAndroidNativePlatform()) throw new Error("Native updates are only available on Android");
  return NativeAppUpdate.startUpdate({ type });
}

export function wasNativeUpdateAccepted(result: NativeAppUpdateStartResult): boolean {
  return result.started && result.accepted;
}

export async function completeNativeAppUpdate(): Promise<void> {
  if (!isAndroidNativePlatform()) throw new Error("Native updates are only available on Android");
  await NativeAppUpdate.completeUpdate();
}

export async function addNativeUpdateListener(
  callback: (state: NativeAppUpdateState) => void,
): Promise<PluginListenerHandle> {
  if (!isAndroidNativePlatform()) return { remove: async () => undefined };
  return NativeAppUpdate.addListener("installStateChange", callback);
}
