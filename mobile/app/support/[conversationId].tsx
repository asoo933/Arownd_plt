import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { StyleSheet, TextInput, View } from "react-native";

import { CustomerScreen, EmptyState, ErrorState, LoadingState } from "@/components/customer-ui";
import { Button, Caption, Heading, Icon, PressableSurface, Text as UiText } from "@/components/ui";
import { fetchSupportConversation, fetchSupportMessages, sendSupportMessage, supportMessageInputSchema, type SupportMessageInput } from "@/lib/support";
import { getSupabaseClient } from "@/lib/supabase";
import { translate, useLanguage } from "@/lib/i18n";
import { designTokens, useAppTheme } from "@/lib/theme";

function dateLabel(value: string, language: "ar" | "en"): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(language === "ar" ? "ar-DZ" : "en-DZ", {
    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"
  }).format(date);
}

export default function SupportConversationScreen() {
  const theme = useAppTheme();
  const styles = createStyles(theme);
  const { language } = useLanguage();
  const queryClient = useQueryClient();
  const { conversationId } = useLocalSearchParams<{ conversationId: string }>();
  const [sendError, setSendError] = useState(false);
  const { control, handleSubmit, reset, formState: { errors, isValid } } = useForm<SupportMessageInput>({
    resolver: zodResolver(supportMessageInputSchema),
    defaultValues: { message: "" },
    mode: "onChange"
  });

  const auth = useQuery({
    queryKey: ["support-auth"],
    queryFn: async () => {
      const { data, error } = await getSupabaseClient().auth.getUser();
      if (error) throw error;
      return data.user;
    },
    retry: false
  });
  const conversation = useQuery({
    queryKey: ["support-conversation", conversationId],
    queryFn: () => fetchSupportConversation(conversationId),
    enabled: Boolean(conversationId) && auth.isSuccess && Boolean(auth.data)
  });
  const messages = useQuery({
    queryKey: ["support-messages", conversationId],
    queryFn: () => fetchSupportMessages(conversationId),
    enabled: Boolean(conversationId) && auth.isSuccess && Boolean(auth.data)
  });

  useEffect(() => {
    if (!conversationId) return;
    const client = getSupabaseClient();
    const channel = client.channel("support-conversation-" + conversationId)
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "support_messages",
        filter: "conversation_id=eq." + conversationId
      }, () => {
        void queryClient.invalidateQueries({ queryKey: ["support-messages", conversationId] });
        void queryClient.invalidateQueries({ queryKey: ["support-conversation", conversationId] });
        void queryClient.invalidateQueries({ queryKey: ["my-support-conversations", auth.data?.id] });
      })
      .subscribe();
    return () => { void client.removeChannel(channel); };
  }, [conversationId, auth.data?.id, queryClient]);

  const sendMutation = useMutation({
    mutationFn: (message: string) => sendSupportMessage(conversationId, message),
    onSuccess: async () => {
      reset({ message: "" });
      setSendError(false);
      await queryClient.invalidateQueries({ queryKey: ["support-messages", conversationId] });
      await queryClient.invalidateQueries({ queryKey: ["my-support-conversations", auth.data?.id] });
    },
    onError: () => setSendError(true)
  });

  if (auth.isPending || conversation.isPending || messages.isPending) {
    return <CustomerScreen showNavigation={false}><SupportHeader title={translate("supportConversationTitle")} theme={theme} styles={styles} /><LoadingState label={translate("stateLoading")} /></CustomerScreen>;
  }
  if (auth.isError || conversation.isError || messages.isError) {
    return <CustomerScreen showNavigation={false}>
      <SupportHeader title={translate("supportConversationTitle")} theme={theme} styles={styles} />
      <ErrorState title={translate("supportLoadError")} retryLabel={translate("retry")} onRetry={() => { void conversation.refetch(); void messages.refetch(); }} busy={conversation.isFetching || messages.isFetching} />
    </CustomerScreen>;
  }
  if (!auth.data || !conversation.data) {
    return <CustomerScreen showNavigation={false}>
      <AppHeader title={translate("supportConversationTitle")} />
      <EmptyState icon="message-circle" title={translate("supportNotFound")} hint={translate("supportNotFoundHint")} />
    </CustomerScreen>;
  }

  const closed = conversation.data.status === "closed";
  return (
    <CustomerScreen showNavigation={false} onRefresh={() => { void messages.refetch(); }} refreshing={messages.isFetching}>
      <SupportHeader title={translate("supportConversationTitle")} theme={theme} styles={styles} />
      <View style={styles.heading}>
        <UiText weight="800">{conversation.data.subject}</UiText>
        <Caption>{closed ? translate("supportStatusClosed") : translate("supportStatusOpen")}</Caption>
      </View>
      {(messages.data ?? []).length === 0 ? (
        <EmptyState icon="message-circle" title={translate("supportMessagesEmpty")} />
      ) : (messages.data ?? []).map((item) => {
        const own = item.sender_role === "customer";
        return (
          <View key={item.id} style={[styles.message, own ? (language === "ar" ? styles.ownMessageRtl : styles.ownMessageLtr) : (language === "ar" ? styles.teamMessageRtl : styles.teamMessageLtr), { backgroundColor: own ? theme.colors.accent : theme.colors.surface }]}>
            <Caption style={{ color: theme.colors.foreground }}>{own ? translate("supportYou") : translate("supportTeam")}</Caption>
            <UiText style={{ color: theme.colors.foreground }}>{item.message}</UiText>
            <Caption style={{ color: theme.colors.foregroundSecondary }}>{dateLabel(item.created_at, language)}</Caption>
          </View>
        );
      })}
      {closed ? (
        <Caption>{translate("supportClosedHint")}</Caption>
      ) : (
        <View style={styles.composer}>
          <Controller
            control={control}
            name="message"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                placeholder={translate("supportReplyPlaceholder")}
                placeholderTextColor={theme.colors.subtle}
                maxLength={4000}
                multiline
                textAlignVertical="top"
                style={styles.input}
                accessibilityLabel={translate("supportReplyPlaceholder")}
              />
            )}
          />
          {errors.message ? <UiText tone="danger">{translate("supportMessageInvalid")}</UiText> : null}
          {sendError ? <UiText tone="danger">{translate("supportSendError")}</UiText> : null}
          <Button label={translate("supportSend")} onPress={() => { void handleSubmit(({ message }) => sendMutation.mutate(message))(); }} loading={sendMutation.isPending} disabled={!isValid} fullWidth />
        </View>
      )}
    </CustomerScreen>
  );
}

function createStyles(theme: ReturnType<typeof useAppTheme>) {
  return StyleSheet.create({
    headerRow: { flexDirection: "row", alignItems: "center", gap: designTokens.spacing.md },
    headerTitle: { flex: 1, textAlign: "auto" },
    backButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center", borderRadius: designTokens.radius.md, backgroundColor: theme.colors.surfaceSecondary },
    heading: { alignItems: "flex-start", gap: designTokens.spacing.xs, paddingVertical: designTokens.spacing.sm },
    message: { maxWidth: "88%", borderRadius: designTokens.radius.lg, padding: designTokens.spacing.md, gap: designTokens.spacing.xs },
    ownMessageLtr: { alignSelf: "flex-end", borderBottomRightRadius: 4 },
    ownMessageRtl: { alignSelf: "flex-start", borderBottomRightRadius: 4 },
    teamMessageLtr: { alignSelf: "flex-start", borderBottomLeftRadius: 4, borderWidth: StyleSheet.hairlineWidth, borderColor: theme.colors.border },
    teamMessageRtl: { alignSelf: "flex-end", borderBottomLeftRadius: 4, borderWidth: StyleSheet.hairlineWidth, borderColor: theme.colors.border },
    composer: { gap: designTokens.spacing.sm, paddingTop: designTokens.spacing.md },
    input: { minHeight: 88, maxHeight: 160, borderWidth: 1, borderColor: theme.colors.border, borderRadius: designTokens.radius.md, paddingHorizontal: designTokens.spacing.md, paddingVertical: designTokens.spacing.md, color: theme.colors.foreground, backgroundColor: theme.colors.surface, textAlign: "auto", fontFamily: theme.fontFamilies.arabic }
  });
}


function SupportHeader({ title, theme, styles }: {
  title: string;
  theme: ReturnType<typeof useAppTheme>;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={styles.headerRow}>
      <Heading level={2} style={styles.headerTitle}>{title}</Heading>
      <PressableSurface
        accessibilityRole="button"
        accessibilityLabel={translate("back")}
        onPress={() => router.back()}
        style={styles.backButton}
      >
        <Icon name="chevron-right" size={22} color={theme.colors.foreground} />
      </PressableSurface>
    </View>
  );
}
