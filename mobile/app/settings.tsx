import { useState } from "react";
import { router } from "expo-router";
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { CustomerHeading, CustomerScreen } from "@/components/customer-ui";
import { translate } from "@/lib/i18n";
import { resetPasswordSchema } from "@/lib/auth-validation";
import { getSupabaseClient } from "@/lib/supabase";
import { useAppTheme } from "@/lib/theme";

export default function SettingsScreen() {
  const theme = useAppTheme();
  const queryClient = useQueryClient();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [signOutError, setSignOutError] = useState(false);
  const [signOutConfirmOpen, setSignOutConfirmOpen] = useState(false);
  const colors = {
    text: theme.colors.foreground,
    muted: theme.colors.muted,
    card: theme.colors.surface,
    border: theme.colors.border,
    input: theme.colors.surface
  };
  const passwordMutation = useMutation({
    mutationFn: async () => {
      const parsed = resetPasswordSchema.safeParse({ password, confirmPassword });
      if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "passwordInvalid");
      const { error } = await getSupabaseClient().auth.updateUser({ password: parsed.data.password });
      if (error) throw error;
    },
    onSuccess: () => {
      setFormError(null);
      setMessage(translate("settingsPasswordSaved"));
      setPassword("");
      setConfirmPassword("");
    },
    onError: (error: Error) => {
      setMessage(null);
      setFormError(error.message === "passwordMin"
        ? translate("passwordMin")
        : error.message === "passwordMismatch"
          ? translate("passwordMismatch")
          : error.message === "required"
            ? translate("required")
            : translate("settingsPasswordError"));
    }
  });
  const signOutMutation = useMutation({
    mutationFn: async () => {
      const { error } = await getSupabaseClient().auth.signOut();
      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.clear();
      router.replace("/login");
    },
    onError: () => setSignOutError(true)
  });

  const fieldStyle = [
    styles.input,
    { backgroundColor: colors.input, borderColor: colors.border, color: colors.text }
  ];

  return (
    <CustomerScreen>
      <CustomerHeading title={translate("settingsTitle")} subtitle={translate("settingsSubtitle")} />
      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>{translate("settingsSecurityTitle")}</Text>
        <Text style={[styles.hint, { color: colors.muted }]}>{translate("settingsPasswordHint")}</Text>
        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder={translate("newPassword")}
          placeholderTextColor={colors.muted}
          secureTextEntry
          autoCapitalize="none"
          textContentType="newPassword"
          style={fieldStyle}
        />
        <TextInput
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          placeholder={translate("confirmPassword")}
          placeholderTextColor={colors.muted}
          secureTextEntry
          autoCapitalize="none"
          textContentType="newPassword"
          style={fieldStyle}
        />
        {formError ? <Text accessibilityRole="alert" style={styles.error}>{formError}</Text> : null}
        {message ? <Text accessibilityRole="text" style={styles.success}>{message}</Text> : null}
        <Pressable accessibilityRole="button" disabled={passwordMutation.isPending} onPress={() => passwordMutation.mutate()} style={[styles.primary, passwordMutation.isPending ? styles.disabled : undefined]}>
          <Text style={styles.primaryText}>{passwordMutation.isPending ? translate("settingsSaving") : translate("settingsPasswordSave")}</Text>
        </Pressable>
      </View>
      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>{translate("settingsAccountTitle")}</Text>
        <Pressable accessibilityRole="button" onPress={() => router.push("/delivery-profile")} style={styles.linkRow}>
          <Text style={[styles.linkText, { color: colors.text }]}>{translate("profileEditDetails")}</Text>
          <Text style={[styles.arrow, { color: theme.colors.muted }]}>‹</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={() => router.push("/forgot-password")} style={styles.linkRow}>
          <Text style={[styles.linkText, { color: colors.text }]}>{translate("forgotPassword")}</Text>
          <Text style={styles.arrow}>‹</Text>
        </Pressable>
      </View>
      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Pressable accessibilityRole="button" disabled={signOutMutation.isPending} onPress={() => { setSignOutError(false); setSignOutConfirmOpen(true); }} style={styles.signOut}>
          <Text style={styles.signOutText}>{signOutMutation.isPending ? translate("settingsSigningOut") : translate("settingsSignOut")}</Text>
        </Pressable>
        {signOutError ? <Text accessibilityRole="alert" style={styles.error}>{translate("settingsSignOutError")}</Text> : null}
      </View>
      <Modal visible={signOutConfirmOpen} transparent animationType="fade" onRequestClose={() => { if (!signOutMutation.isPending) setSignOutConfirmOpen(false); }}>
        <View style={[styles.modalBackdrop, { backgroundColor: theme.colors.overlay }]}>
          <View style={[styles.modalPanel, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <Text style={[styles.sectionTitle, { color: theme.colors.foreground }]}>{translate("settingsSignOutConfirmTitle")}</Text>
            <Text style={[styles.hint, { color: theme.colors.muted }]}>{translate("settingsSignOutConfirmHint")}</Text>
            {signOutError ? <Text accessibilityRole="alert" style={styles.error}>{translate("settingsSignOutError")}</Text> : null}
            <View style={styles.modalActions}>
              <Pressable accessibilityRole="button" disabled={signOutMutation.isPending} onPress={() => setSignOutConfirmOpen(false)} style={[styles.modalSecondary, { borderColor: theme.colors.border }]}>
                <Text style={[styles.modalSecondaryText, { color: theme.colors.foreground }]}>{translate("back")}</Text>
              </Pressable>
              <Pressable accessibilityRole="button" disabled={signOutMutation.isPending} onPress={() => { setSignOutError(false); signOutMutation.mutate(); }} style={[styles.modalDanger, { backgroundColor: theme.colors.danger }]}>
                <Text style={styles.modalDangerText}>{signOutMutation.isPending ? translate("settingsSigningOut") : translate("settingsSignOutConfirmAction")}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </CustomerScreen>
  );
}

const styles = StyleSheet.create({
  section: { borderWidth: 1, borderRadius: 19, padding: 16, gap: 12 },
  sectionTitle: { fontSize: 15, fontWeight: "900", textAlign: "right" },
  hint: { fontSize: 12, lineHeight: 19, textAlign: "right" },
  input: { minHeight: 48, borderWidth: 1, borderRadius: 13, paddingHorizontal: 13, textAlign: "right", fontSize: 14 },
  primary: { minHeight: 47, borderRadius: 13, backgroundColor: "#C6F135", alignItems: "center", justifyContent: "center" },
  primaryText: { color: "#0A0A0A", fontWeight: "900" },
  disabled: { opacity: 0.6 },
  error: { color: "#D94848", fontSize: 12, textAlign: "right" },
  success: { color: "#668414", fontSize: 12, textAlign: "right", fontWeight: "700" },
  linkRow: { minHeight: 45, flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between" },
  linkText: { fontSize: 13, fontWeight: "700" },
  arrow: { color: "#7A7A7A", fontSize: 22 },
  signOut: { minHeight: 46, borderRadius: 13, borderWidth: 1, borderColor: "#D94848", alignItems: "center", justifyContent: "center" },
  signOutText: { color: "#D94848", fontWeight: "900" },
  modalBackdrop: { flex: 1, justifyContent: "center", padding: 22 },
  modalPanel: { borderWidth: 1, borderRadius: 20, padding: 18, gap: 14 },
  modalActions: { flexDirection: "row-reverse", gap: 9 },
  modalSecondary: { flex: 1, minHeight: 46, borderWidth: 1, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  modalSecondaryText: { fontSize: 13, fontWeight: "800" },
  modalDanger: { flex: 1, minHeight: 46, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  modalDangerText: { color: "#FFFFFF", fontSize: 13, fontWeight: "900" }
});
