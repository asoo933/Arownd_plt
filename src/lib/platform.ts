/**
 * Runtime detection shared by web and Capacitor builds.
 *
 * Keep this module dependency-free so the web build does not need to load
 * native Capacitor packages. Capacitor's iOS scheme is explicit; Android's
 * default WebView origin is http://localhost and exposes the Capacitor bridge.
 */
type CapacitorBridge = {
  isNativePlatform?: () => boolean;
  getPlatform?: () => string;
};

type CapacitorWindow = Window & {
  Capacitor?: CapacitorBridge;
};

export function isNativePlatform(): boolean {
  if (typeof window === "undefined") return false;

  const runtime = window as CapacitorWindow;
  if (runtime.Capacitor?.isNativePlatform?.() === true) return true;

  if (window.location.protocol === "capacitor:") return true;

  // Android commonly serves the local bundle from http://localhost. Do not
  // treat Capacitor's web platform as native just because its bridge exists.
  return (
    window.location.protocol === "http:" &&
    window.location.hostname === "localhost" &&
    (runtime.Capacitor?.getPlatform?.() === "android" ||
      runtime.Capacitor?.getPlatform?.() === "ios")
  );
}


/** True only inside the native Android runtime (never iOS or a regular browser). */
export function isAndroidNativePlatform(): boolean {
  if (typeof window === "undefined") return false;
  const runtime = window as CapacitorWindow;
  return runtime.Capacitor?.getPlatform?.() === "android" && isNativePlatform();
}
