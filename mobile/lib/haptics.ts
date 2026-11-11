import * as Haptics from "expo-haptics";

export function triggerSelectionHaptic(): void {
  void Haptics.selectionAsync().catch(() => undefined);
}

export function triggerLightImpactHaptic(): void {
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
}

export function triggerSuccessHaptic(): void {
  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
}
