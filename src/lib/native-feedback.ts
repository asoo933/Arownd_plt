import { isNativePlatform } from "@/lib/platform";

type FeedbackStyle = "light" | "medium" | "heavy";

/** Small, optional native feedback. Web remains silent and plugin failures never block an action. */
export async function tapFeedback(style: FeedbackStyle = "light"): Promise<void> {
  if (!isNativePlatform()) return;
  try {
    const { Haptics, ImpactStyle } = await import("@capacitor/haptics");
    const nativeStyle =
      style === "heavy" ? ImpactStyle.Heavy :
      style === "medium" ? ImpactStyle.Medium :
      ImpactStyle.Light;
    await Haptics.impact({ style: nativeStyle });
  } catch {
    // Haptics are an enhancement; never interrupt the primary interaction.
  }
}
