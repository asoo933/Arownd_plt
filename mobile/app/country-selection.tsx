import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { router } from "expo-router";

import { Text as UiText } from "@/components/ui";
import { detectCountryFromIp, fetchCountries, saveSelectedCountryCode, type Country } from "@/lib/country-service";
import { translate, useLanguage } from "@/lib/i18n";
import { useAppTheme } from "@/lib/theme";

export default function CountrySelectionScreen() {
  const { language } = useLanguage();
  const theme = useAppTheme();
  const [countries, setCountries] = useState<Country[]>([]);
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [suggestedCode, setSuggestedCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedCountry = useMemo(
    () => countries.find((country) => country.code === selectedCode && country.is_enabled) ?? null,
    [countries, selectedCode]
  );

  const loadCountries = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const availableCountries = await fetchCountries();
      setCountries(availableCountries);
      const detectedCode = await detectCountryFromIp();
      const suggested = availableCountries.find((country) => country.code === detectedCode && country.is_enabled);
      setSuggestedCode(suggested?.code ?? null);
      const firstEnabled = availableCountries.find((country) => country.is_enabled);
      setSelectedCode(suggested?.code ?? firstEnabled?.code ?? null);
    } catch {
      setError(translate("countrySelectionLoadError"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCountries();
  }, [loadCountries]);

  const continueWithCountry = async () => {
    if (!selectedCountry || saving) return;
    setSaving(true);
    try {
      await saveSelectedCountryCode(selectedCountry.code);
      router.replace("/login");
    } catch {
      setError(translate("genericError"));
      setSaving(false);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.heading}>
          <UiText style={[styles.eyebrow, { color: theme.colors.muted }]}>AROWND</UiText>
          <UiText style={[styles.title, { color: theme.colors.foreground }]}>{translate("countrySelectionTitle")}</UiText>
          <UiText style={[styles.subtitle, { color: theme.colors.muted }]}>{translate("countrySelectionSubtitle")}</UiText>
        </View>

        {loading ? (
          <View style={styles.loading}><ActivityIndicator color={theme.colors.foreground} /></View>
        ) : error ? (
          <View style={styles.errorBlock}>
            <UiText style={{ color: theme.colors.foreground }}>{error}</UiText>
            <Pressable onPress={() => void loadCountries()} accessibilityRole="button">
              <UiText style={[styles.retry, { color: theme.colors.foreground }]}>{translate("retry")}</UiText>
            </Pressable>
            <Pressable onPress={() => router.replace("/login")} accessibilityRole="button">
              <UiText style={[styles.retry, { color: theme.colors.muted }]}>{translate("countrySelectionLogin")}</UiText>
            </Pressable>
          </View>
        ) : (
          <>
            {suggestedCode ? <UiText style={[styles.suggestion, { color: theme.colors.muted }]}>{translate("countrySelectionSuggestion")}</UiText> : null}
            <View style={styles.list}>
              {countries.map((country) => {
                const enabled = country.is_enabled;
                const selected = selectedCode === country.code && enabled;
                const name = language === "ar" ? country.name_ar : country.name_en ?? country.name_ar;
                const currencyName = language === "ar" ? country.currency_name_ar ?? country.currency_code : country.currency_name_en ?? country.currency_code;
                return (
                  <Pressable
                    key={country.code}
                    disabled={!enabled}
                    onPress={() => setSelectedCode(country.code)}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: selected, disabled: !enabled }}
                    style={[
                      styles.country,
                      {
                        backgroundColor: selected ? theme.colors.surfaceSecondary : theme.colors.surface,
                        borderColor: selected ? theme.colors.foreground : theme.colors.border,
                        opacity: enabled ? 1 : 0.55
                      }
                    ]}
                  >
                    <UiText style={styles.flag}>{country.flag_emoji ?? "🌐"}</UiText>
                    <View style={styles.countryDetails}>
                      <UiText style={[styles.countryName, { color: theme.colors.foreground }]}>{name}</UiText>
                      <UiText style={[styles.currency, { color: theme.colors.muted }]}>{translate("countrySelectionCurrency")}: {country.currency_code} · {currencyName}</UiText>
                    </View>
                    {!enabled ? (
                      <UiText style={[styles.comingSoon, { color: theme.colors.muted }]}>{translate("countrySelectionComingSoon")}</UiText>
                    ) : selected ? (
                      <UiText style={[styles.check, { color: theme.colors.foreground }]}>✓</UiText>
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
            <UiText style={[styles.note, { color: theme.colors.muted }]}>{translate("countrySelectionIpNote")}</UiText>
          </>
        )}

        {!error && (
          <Pressable
            onPress={() => void continueWithCountry()}
            disabled={!selectedCountry || saving || loading}
            accessibilityRole="button"
            style={[styles.continueButton, { backgroundColor: theme.colors.foreground, opacity: selectedCountry && !saving && !loading ? 1 : 0.45 }]}
          >
            {saving ? <ActivityIndicator color={theme.colors.background} /> : (
              <UiText style={[styles.continueText, { color: theme.colors.background }]}>{translate("countrySelectionContinue")}</UiText>
            )}
          </Pressable>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 64, paddingBottom: 32, gap: 20 },
  heading: { gap: 10, marginBottom: 8 },
  eyebrow: { fontSize: 12, fontWeight: "700", letterSpacing: 2 },
  title: { fontSize: 28, fontWeight: "800", textAlign: "left" },
  subtitle: { fontSize: 14, lineHeight: 23, textAlign: "left" },
  loading: { minHeight: 180, alignItems: "center", justifyContent: "center" },
  errorBlock: { minHeight: 180, alignItems: "center", justifyContent: "center", gap: 16 },
  retry: { fontWeight: "700", padding: 8 },
  suggestion: { fontSize: 13, fontWeight: "600" },
  list: { gap: 10 },
  country: { minHeight: 76, borderWidth: 1, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12, flexDirection: "row", alignItems: "center", gap: 12 },
  flag: { fontSize: 28 },
  countryDetails: { flex: 1, gap: 4 },
  countryName: { fontSize: 15, fontWeight: "700" },
  currency: { fontSize: 12 },
  comingSoon: { fontSize: 11, fontWeight: "600" },
  check: { fontSize: 20, fontWeight: "800" },
  note: { fontSize: 12, lineHeight: 19 },
  continueButton: { minHeight: 54, borderRadius: 16, alignItems: "center", justifyContent: "center", marginTop: "auto", paddingHorizontal: 18 },
  continueText: { fontSize: 15, fontWeight: "700" }
});
