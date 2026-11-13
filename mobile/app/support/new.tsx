import { useMutation, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";
import { StyleSheet, TextInput, View } from "react-native";

import { CustomerScreen } from "@/components/customer-ui";
import { Button, Caption, Heading, Icon, PressableSurface, Text as UiText, TextField } from "@/components/ui";
import { createSupportConversation, supportConversationInputSchema } from "@/lib/support";
import { translate } from "@/lib/i18n";
import { designTokens, useAppTheme } from "@/lib/theme";

export default function NewSupportConversationScreen() {
  const theme = useAppTheme();
  const styles = createStyles(theme);
  const queryClient = useQueryClient();
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [submitError, setSubmitError] = useState(false);

  const createMutation = useMutation({
    mutationFn: () => createSupportConversation(subject, message),
    onSuccess: async (conversationId) => {
      await queryClient.invalidateQueries({ queryKey: ["my-support-conversations"] });
      router.replace("/support/" + conversationId);
    },
    onError: () => setSubmitError(true)
  });
  const createMutationPending = createMutation.isPending;
  const canSubmit = supportConversationInputSchema.safeParse({ subject, message }).success && !createMutationPending;

  return (
    <CustomerScreen
      showNavigation={false}
      footer={
        <Button
          label={translate("supportSend")}
          onPress={() => {
            setSubmitError(false);
            if (supportConversationInputSchema.safeParse({ subject, message }).success) createMutation.mutate();
          }}
          disabled={!canSubmit}
          loading={createMutationPending}
          fullWidth
        />
      }
    >
      <View style={styles.header}>
        <PressableSurface accessibilityRole="button" accessibilityLabel={translate("back")} onPress={() => router.back()} style={styles.backButton}>
          <Icon name="chevron-right" size={22} color={theme.colors.foreground} />
        </PressableSurface>
        <Heading level={2} style={styles.title}>{translate("supportNewMessage")}</Heading>
      </View>
      <Caption>{translate("supportContactHint")}</Caption>
      <TextField
        value={subject}
        onChangeText={(value) => { setSubject(value); setSubmitError(false); }}
        placeholder={translate("supportSubjectPlaceholder")}
        maxLength={120}
        style={styles.subject}
      />
      <View style={styles.messageField}>
        <TextInput
          value={message}
          onChangeText={(value) => { setMessage(value); setSubmitError(false); }}
          placeholder={translate("supportMessagePlaceholder")}
          placeholderTextColor={theme.colors.placeholder}
          maxLength={4000}
          multiline
          textAlignVertical="top"
          style={styles.messageInput}
          accessibilityLabel={translate("supportMessagePlaceholder")}
        />
        <Caption style={styles.counter}>{message.length}/4000</Caption>
      </View>
      {!subject.trim() || !message.trim() ? <Caption>{translate("supportRequiredFieldsHint")}</Caption> : null}
      {subject.trim().length > 0 && subject.trim().length < 3 ? <UiText tone="danger">{translate("supportSubjectInvalid")}</UiText> : null}
      {message.trim().length === 0 && message.length > 0 ? <UiText tone="danger">{translate("supportMessageInvalid")}</UiText> : null}
      {submitError ? <UiText tone="danger">{translate("supportSendError")}</UiText> : null}
      <Caption>{translate("supportResponseTimeHint")}</Caption>
    </CustomerScreen>
  );
}

function createStyles(theme: ReturnType<typeof useAppTheme>) {
  return StyleSheet.create({
    header: { flexDirection: "row", alignItems: "center", gap: designTokens.spacing.md },
    title: { flex: 1 },
    backButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center", borderRadius: designTokens.radius.md, backgroundColor: theme.colors.surfaceSecondary },
    subject: { minHeight: designTokens.dimensions.controlHeight.lg },
    messageField: { minHeight: 180, borderWidth: 1, borderColor: theme.colors.inputBorder, borderRadius: designTokens.radius.lg, backgroundColor: theme.colors.surface, padding: designTokens.spacing.md, gap: designTokens.spacing.xs },
    messageInput: { minHeight: 130, color: theme.colors.foreground, fontSize: designTokens.typography.body, textAlign: "auto", fontFamily: theme.fontFamilies.arabic },
    counter: { textAlign: "right" }
  });
}
