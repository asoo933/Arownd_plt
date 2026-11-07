import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { Pressable, StyleSheet, Text } from "react-native";

import { CART_QUERY_KEY, getCart } from "@/lib/cart";
import { translate } from "@/lib/i18n";

export function CartButton() {
  const cart = useQuery({ queryKey: CART_QUERY_KEY, queryFn: getCart });
  const count = cart.data?.reduce((sum, item) => sum + item.quantity, 0) ?? 0;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={translate("cartTitle")} onPress={() => router.push("/cart")} style={styles.button}>
      <Text style={styles.icon}>▱</Text>
      <Text style={styles.label}>{translate("cartTitle")}</Text>
      {count > 0 ? <Text style={styles.count}>{count > 99 ? "99+" : count}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { minHeight: 42, flexDirection: "row-reverse", alignItems: "center", gap: 6, paddingHorizontal: 10, borderRadius: 13, backgroundColor: "#C6F135" },
  icon: { color: "#0A0A0A", fontSize: 19, fontWeight: "900" },
  label: { color: "#0A0A0A", fontSize: 11, fontWeight: "800" },
  count: { minWidth: 19, height: 19, borderRadius: 10, overflow: "hidden", textAlign: "center", textAlignVertical: "center", backgroundColor: "#0A0A0A", color: "#C6F135", fontSize: 10, fontWeight: "900" }
});
