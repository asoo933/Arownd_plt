import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { AuthLayout, ActionButton } from "@/components/auth-ui";
import { translate } from "@/lib/i18n";

export default function AccountTypeScreen() {
  return (
    <AuthLayout
      title={translate("chooseAccountTitle")}
      subtitle={translate("chooseAccountSubtitle")}
      showBack
    >
      <View style={styles.options}>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push("/signup-personal")}
          style={({ pressed }) => [styles.option, pressed ? styles.pressed : undefined]}
        >
          <View style={styles.iconCircle}><Text style={styles.icon}>◎</Text></View>
          <View style={styles.copy}>
            <Text style={styles.optionTitle}>{translate("personalTitle")}</Text>
            <Text style={styles.optionDescription}>{translate("personalDescription")}</Text>
          </View>
          <Text style={styles.arrow}>‹</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push("/signup-business")}
          style={({ pressed }) => [styles.option, pressed ? styles.pressed : undefined]}
        >
          <View style={styles.iconCircle}><Text style={styles.icon}>▦</Text></View>
          <View style={styles.copy}>
            <Text style={styles.optionTitle}>{translate("businessTitle")}</Text>
            <Text style={styles.optionDescription}>{translate("businessDescription")}</Text>
          </View>
          <Text style={styles.arrow}>‹</Text>
        </Pressable>
        <ActionButton label={translate("backToLogin")} onPress={() => router.replace("/login")} />
      </View>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  options: { gap: 14 },
  option: {
    minHeight: 112,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E5E5E5",
    backgroundColor: "#FFFFFF",
    padding: 17,
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 13
  },
  pressed: { opacity: 0.75, borderColor: "#A7C82A" },
  iconCircle: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: "#F0F8D7",
    alignItems: "center",
    justifyContent: "center"
  },
  icon: { color: "#0A0A0A", fontSize: 25, fontWeight: "800" },
  copy: { flex: 1, gap: 5 },
  optionTitle: { color: "#0A0A0A", fontSize: 15, fontWeight: "800", textAlign: "right" },
  optionDescription: { color: "#737373", fontSize: 12, lineHeight: 20, textAlign: "right" },
  arrow: { color: "#737373", fontSize: 25 }
});