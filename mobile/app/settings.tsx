import { useState } from "react";
import { router } from "expo-router";
import { Modal, StyleSheet, Text, View } from "react-native";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { CustomerScreen } from "@/components/customer-ui";
import { AppHeader, Button, PressableSurface, TextField } from "@/components/ui";
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
      <AppHeader title={translate("settingsTitle")} />
      <Text style={[styles.hint, { color: colors.muted }]}>{translate("settingsSubtitle")}</Text>
      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>{translate("settingsSecurityTitle")}</Text>
        <Text style={[styles.hint, { color: colors.muted }]}>{translate("settingsPasswordHint")}</Text>
        <TextField value={password} onChangeText={setPassword} placeholder={translate("newPassword")} secureTextEntry autoCapitalize="none" textContentType="newPassword" style={fieldStyle} />
        <TextField value={confirmPassword} onChangeText={setConfirmPassword} placeholder={translate("confirmPassword")} secureTextEntry autoCapitalize="none" textContentType="newPassword" style={fieldStyle} />
        {formError ? <Text accessibilityRole="alert" style={[styles.error, { color: theme.colors.danger }]}>{formError}</Text> : null}
        {message ? <Text accessibilityRole="text" style={[styles.success, { color: theme.colors.success }]}>{message}</Text> : null}
        <Button label={passwordMutation.isPending ? translate("settingsSaving") : translate("settingsPasswordSave")} onPress={() => passwordMutation.mutate()} loading={passwordMutation.isPending} fullWidth />
      </View>
      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>{translate("settingsAccountTitle")}</Text>
        <PressableSurface accessibilityRole="button" accessibilityLabel={translate("profileEditDetails")} onPress={() => router.push("/delivery-profile")} style={styles.linkRow}>
          <Text style={[styles.linkText, { color: colors.text }]}>{translate("profileEditDetails")}</Text>
          <Text style={[styles.arrow, { color: theme.colors.muted }]}>‹</Text>
        </PressableSurface>
        <PressableSurface accessibilityRole="button" accessibilityLabel={translate("forgotPassword")} onPress={() => router.push("/forgot-password")} style={styles.linkRow}>
          <Text style={[styles.linkText, { color: colors.text }]}>{translate("forgotPassword")}</Text>
          <Text style={[styles.arrow, { color: theme.colors.muted }]}>‹</Text>
        </PressableSurface>
      </View>
      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Button label={signOutMutation.isPending ? translate("settingsSigningOut") : translate("settingsSignOut")} onPress={() => { setSignOutError(false); setSignOutConfirmOpen(true); }} disabled={signOutMutation.isPending} variant="danger" fullWidth />
        {signOutError ? <Text accessibilityRole="alert" style={[styles.error, { color: theme.colors.danger }]}>{translate("settingsSignOutError")}</Text> : null}
      </View>
      <Modal visible={signOutConfirmOpen} transparent animationType="fade" onRequestClose={() => { if (!signOutMutation.isPending) setSignOutConfirmOpen(false); }}>
        <View style={[styles.modalBackdrop, { backgroundColor: theme.colors.overlay }]}>
          <View style={[styles.modalPanel, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <Text style={[styles.sectionTitle, { color: theme.colors.foreground }]}>{translate("settingsSignOutConfirmTitle")}</Text>
            <Text style={[styles.hint, { color: theme.colors.muted }]}>{translate("settingsSignOutConfirmHint")}</Text>
            {signOutError ? <Text accessibilityRole="alert" style={[styles.error, { color: theme.colors.danger }]}>{translate("settingsSignOutError")}</Text> : null}
            <View style={styles.modalActions}>
              <Button label={translate("back")} onPress={() => setSignOutConfirmOpen(false)} disabled={signOutMutation.isPending} variant="outline" style={{ flex: 1 }} />
              <Button label={signOutMutation.isPending ? translate("settingsSigningOut") : translate("settingsSignOutConfirmAction")} onPress={() => { setSignOutError(false); signOutMutation.mutate(); }} loading={signOutMutation.isPending} variant="danger" style={{ flex: 1 }} />
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
  error: { color: "#D94848", fontSize: 12, textAlign: "right" },
  success: { color: "#668414", fontSize: 12, textAlign: "right", fontWeight: "700" },
  linkRow: { minHeight: 48, flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between" },
  linkText: { fontSize: 13, fontWeight: "700" },
  arrow: { color: "#7A7A7A", fontSize: 22 },
  modalBackdrop: { flex: 1, justifyContent: "center", padding: 22 },
  modalPanel: { borderWidth: 1, borderRadius: 20, padding: 18, gap: 14 },
  modalActions: { flexDirection: "row-reverse", gap: 9 }
});
