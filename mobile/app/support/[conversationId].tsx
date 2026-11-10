import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet, TextInput, View } from "react-native";

import { CustomerScreen, EmptyState, ErrorState, LoadingState } from "@/components/customer-ui";
import { AppHeader, Button, Caption, Icon, PressableSurface, Text as UiText } from "@/components/ui";
import { fetchSupportConversation, fetchSupportMessages, sendSupportMessage } from "@/lib/support";
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
  const [draft, setDraft] = useState("");
  const [sendError, setSendError] = useState(false);

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
    mutationFn: () => sendSupportMessage(conversationId, draft),
    onSuccess: async () => {
      setDraft("");
      setSendError(false);
      await queryClient.invalidateQueries({ queryKey: ["support-messages", conversationId] });
      await queryClient.invalidateQueries({ queryKey: ["my-support-conversations", auth.data?.id] });
    },
    onError: () => setSendError(true)
  });

  if (auth.isPending || conversation.isPending || messages.isPending) {
    return <CustomerScreen showNavigation={false}><LoadingState label={translate("stateLoading")} /></CustomerScreen>;
  }
  if (auth.isError || conversation.isError || messages.isError) {
    return <CustomerScreen showNavigation={false}>
      <AppHeader title={translate("supportConversationTitle")} />
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
      <PressableSurface accessibilityRole="button" accessibilityLabel={translate("back")} onPress={() => router.back()} style={styles.backButton}>
        <Icon name="chevron-right" size={22} color={theme.colors.foreground} />
      </PressableSurface>
      <AppHeader title={translate("supportConversationTitle")} />
      <View style={styles.heading}>
        <UiText weight="800">{conversation.data.subject}</UiText>
        <Caption>{closed ? translate("supportStatusClosed") : translate("supportStatusOpen")}</Caption>
      </View>
      {(messages.data ?? []).length === 0 ? (
        <EmptyState icon="message-circle" title={translate("supportMessagesEmpty")} />
      ) : (messages.data ?? []).map((item) => {
        const own = item.sender_role === "customer";
        return (
          <View key={item.id} style={[styles.message, own ? styles.ownMessage : styles.teamMessage, { backgroundColor: own ? theme.colors.accent : theme.colors.surface }]}>
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
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder={translate("supportReplyPlaceholder")}
            placeholderTextColor={theme.colors.subtle}
            maxLength={4000}
            multiline
            textAlignVertical="top"
            style={styles.input}
            accessibilityLabel={translate("supportReplyPlaceholder")}
          />
          {sendError ? <UiText tone="danger">{translate("supportSendError")}</UiText> : null}
          <Button label={translate("supportSend")} onPress={() => sendMutation.mutate()} loading={sendMutation.isPending} disabled={!draft.trim()} fullWidth />
        </View>
      )}
    </CustomerScreen>
  );
}

function createStyles(theme: ReturnType<typeof useAppTheme>) {
  return StyleSheet.create({
    backButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center", alignSelf: "flex-start", borderRadius: designTokens.radius.md },
    heading: { alignItems: "flex-start", gap: designTokens.spacing.xs, paddingVertical: designTokens.spacing.sm },
    message: { maxWidth: "88%", borderRadius: designTokens.radius.lg, padding: designTokens.spacing.md, gap: designTokens.spacing.xs },
    ownMessage: { alignSelf: "flex-end", borderBottomRightRadius: 4 },
    teamMessage: { alignSelf: "flex-start", borderBottomLeftRadius: 4, borderWidth: StyleSheet.hairlineWidth, borderColor: theme.colors.border },
    composer: { gap: designTokens.spacing.sm, paddingTop: designTokens.spacing.md },
    input: { minHeight: 88, maxHeight: 160, borderWidth: 1, borderColor: theme.colors.border, borderRadius: designTokens.radius.md, paddingHorizontal: designTokens.spacing.md, paddingVertical: designTokens.spacing.md, color: theme.colors.foreground, backgroundColor: theme.colors.surface, textAlign: "auto", fontFamily: "IBMPlexSansArabic" }
  });
}
