import type { ViewStyle } from "react-native";

export const shadows = {
  none: { elevation: 0 } satisfies ViewStyle,
  sm: {
    elevation: 1,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2
  } satisfies ViewStyle,
  md: {
    elevation: 3,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 5
  } satisfies ViewStyle,
  lg: {
    elevation: 6,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 10
  } satisfies ViewStyle
} as const;
