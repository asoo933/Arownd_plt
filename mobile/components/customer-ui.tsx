import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useColorScheme
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const muted = "#737373";

export function CustomerScreen({ children }: { children: React.ReactNode }) {
  const dark = useColorScheme() === "dark";
  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: dark ? "#0A0A0A" : "#F5F5F5" }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

export function CustomerHeading({ title, subtitle }: { title: string; subtitle?: string }) {
  const dark = useColorScheme() === "dark";
  return (
    <View style={styles.heading}>
      <Text style={[styles.headingTitle, { color: dark ? "#F5F5F5" : "#0A0A0A" }]}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

export function CustomerSearch({ value, onChangeText, placeholder }: {
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
}) {
  const dark = useColorScheme() === "dark";
  return (
    <View style={[styles.search, { backgroundColor: dark ? "#171717" : "#FFFFFF", borderColor: dark ? "#333333" : "#E5E5E5" }]}>
      <Text style={styles.searchIcon}>⌕</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={muted}
        style={[styles.searchInput, { color: dark ? "#FFFFFF" : "#0A0A0A" }]}
        textAlign="right"
        returnKeyType="search"
      />
    </View>
  );
}

export function SectionTitle({ title, action, onAction }: {
  title: string;
  action?: string;
  onAction?: () => void;
}) {
  const dark = useColorScheme() === "dark";
  return (
    <View style={styles.sectionTitle}>
      <Text style={[styles.sectionText, { color: dark ? "#F5F5F5" : "#0A0A0A" }]}>{title}</Text>
      {action && onAction ? <Pressable onPress={onAction} hitSlop={8}><Text style={styles.sectionAction}>{action}</Text></Pressable> : null}
    </View>
  );
}

export function ProductTile({ name, store, price, imageUrl }: {
  name: string;
  store: string;
  price: string;
  imageUrl: string | null;
}) {
  const dark = useColorScheme() === "dark";
  return (
    <View style={[styles.productTile, { backgroundColor: dark ? "#171717" : "#FFFFFF" }]}>
      <View style={styles.productImage}>
        {imageUrl ? <Image source={{ uri: imageUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" /> : <Text style={styles.imageFallback}>▧</Text>}
      </View>
      <Text numberOfLines={2} style={[styles.productName, { color: dark ? "#FFFFFF" : "#0A0A0A" }]}>{name}</Text>
      <Text numberOfLines={1} style={styles.productStore}>{store}</Text>
      <Text style={styles.productPrice}>{price}</Text>
    </View>
  );
}

export function StoreTile({ name, description, logoUrl, commune, rating }: {
  name: string;
  description?: string | null;
  logoUrl?: string | null;
  commune?: string | null;
  rating?: number | null;
}) {
  const dark = useColorScheme() === "dark";
  return (
    <View style={[styles.storeTile, { backgroundColor: dark ? "#171717" : "#FFFFFF" }]}>
      <View style={styles.storeLogo}>
        {logoUrl ? <Image source={{ uri: logoUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" /> : <Text style={styles.imageFallback}>⌂</Text>}
      </View>
      <View style={styles.storeInfo}>
        <Text numberOfLines={1} style={[styles.storeName, { color: dark ? "#FFFFFF" : "#0A0A0A" }]}>{name}</Text>
        <Text numberOfLines={1} style={styles.productStore}>{commune || description || " "}</Text>
        {rating != null ? <Text style={styles.storeRating}>★ {rating.toFixed(1)}</Text> : null}
      </View>
      <Text style={styles.verified}>✓</Text>
    </View>
  );
}

export function LoadingState({ label }: { label: string }) {
  return <View style={styles.state}><ActivityIndicator color="#829E19" /><Text style={styles.stateText}>{label}</Text></View>;
}

export function EmptyState({ title, hint }: { title: string; hint: string }) {
  return <View style={styles.state}><Text style={styles.emptyMark}>⌕</Text><Text style={styles.stateTitle}>{title}</Text><Text style={styles.stateText}>{hint}</Text></View>;
}

export function ErrorState({ title, retryLabel, onRetry }: {
  title: string;
  retryLabel: string;
  onRetry: () => void;
}) {
  return (
    <View style={styles.state}>
      <Text style={styles.stateTitle}>{title}</Text>
      <Pressable onPress={onRetry} style={styles.retry}><Text style={styles.retryText}>{retryLabel}</Text></Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { paddingHorizontal: 18, paddingTop: 10, paddingBottom: 28, gap: 22 },
  heading: { gap: 5, alignItems: "flex-end" },
  headingTitle: { fontSize: 22, fontWeight: "900", textAlign: "right" },
  subtitle: { color: muted, fontSize: 12, textAlign: "right", lineHeight: 19 },
  search: { minHeight: 50, borderRadius: 16, borderWidth: 1, flexDirection: "row-reverse", alignItems: "center", paddingHorizontal: 13, gap: 8 },
  searchIcon: { fontSize: 24, color: muted },
  searchInput: { flex: 1, minHeight: 48, fontSize: 14 },
  sectionTitle: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  sectionText: { fontSize: 16, fontWeight: "900", textAlign: "right" },
  sectionAction: { color: "#647D13", fontSize: 12, fontWeight: "800" },
  productTile: { width: 158, borderRadius: 18, padding: 9, gap: 5 },
  productImage: { height: 132, borderRadius: 13, backgroundColor: "#ECEFE4", overflow: "hidden", alignItems: "center", justifyContent: "center" },
  imageFallback: { fontSize: 35, color: "#8A9B55" },
  productName: { minHeight: 38, fontSize: 13, fontWeight: "800", textAlign: "right" },
  productStore: { color: muted, fontSize: 11, textAlign: "right" },
  productPrice: { color: "#647D13", fontSize: 14, fontWeight: "900", textAlign: "right" },
  storeTile: { minHeight: 82, borderRadius: 17, padding: 11, flexDirection: "row-reverse", alignItems: "center", gap: 11 },
  storeLogo: { width: 54, height: 54, borderRadius: 16, overflow: "hidden", backgroundColor: "#ECEFE4", alignItems: "center", justifyContent: "center" },
  storeInfo: { flex: 1, gap: 4, alignItems: "flex-end" },
  storeName: { fontSize: 14, fontWeight: "800" },
  storeRating: { color: "#A07812", fontSize: 11, fontWeight: "700" },
  verified: { color: "#647D13", fontSize: 16, fontWeight: "900" },
  state: { minHeight: 135, alignItems: "center", justifyContent: "center", gap: 9, padding: 20 },
  stateText: { color: muted, fontSize: 12, textAlign: "center" },
  stateTitle: { color: "#737373", fontSize: 14, fontWeight: "800", textAlign: "center" },
  emptyMark: { fontSize: 30, color: "#94A86A" },
  retry: { minHeight: 40, justifyContent: "center", paddingHorizontal: 18, borderRadius: 12, backgroundColor: "#C6F135" },
  retryText: { color: "#0A0A0A", fontSize: 12, fontWeight: "800" }
});
