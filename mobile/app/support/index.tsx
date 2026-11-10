import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet, TextInput, View } from "react-native";

import { CustomerScreen, EmptyState, ErrorState, LoadingState } from "@/components/customer-ui";
import { AppHeader, Button, Caption, Heading, Icon, PressableSurface, Text as UiText } from "@/components/ui";
import { createSupportConversation, fetchMySupportConversations } from "@/lib/support";
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

export default function SupportScreen() {
  const theme = useAppTheme();
  const styles = createStyles(theme);
  const { language } = useLanguage();
  const queryClient = useQueryClient();
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [formError, setFormError] = useState(false);

  const auth = useQuery({
    queryKey: ["support-auth"],
    queryFn: async () => {
      const { data, error } = await getSupabaseClient().auth.getUser();
      if (error) throw error;
      return data.user;
    },
    retry: false
  });
  const conversations = useQuery({
    queryKey: ["my-support-conversations", auth.data?.id],
    queryFn: fetchMySupportConversations,
    enabled: auth.isSuccess && Boolean(auth.data)
  });

  useEffect(() => {
    const userId = auth.data?.id;
    if (!userId) return;
    const client = getSupabaseClient();
    const channel = client.channel("support-inbox-" + userId)
      .on("postgres_changes", {
        event: "*", schema: "public", table: "support_conversations",
        filter: "user_id=eq." + userId
      }, () => {
        void queryClient.invalidateQueries({ queryKey: ["my-support-conversations", userId] });
      })
      .subscribe();
    return () => { void client.removeChannel(channel); };
  }, [auth.data?.id, queryClient]);
  const createMutation = useMutation({
    mutationFn: () => createSupportConversation(subject, message),
    onSuccess: async (id) => {
      setSubject("");
      setMessage("");
      setFormError(false);
      await queryClient.invalidateQueries({ queryKey: ["my-support-conversations", auth.data?.id] });
      router.push("/support/" + id);
    },
    onError: () => setFormError(true)
  });

  if (auth.isPending || (auth.data && conversations.isPending)) {
    return <CustomerScreen showNavigation={false}><LoadingState label={translate("stateLoading")} /></CustomerScreen>;
  }
  if (auth.isError || conversations.isError) {
    return <CustomerScreen showNavigation={false}>
      <AppHeader title={translate("supportTitle")} />
      <ErrorState title={translate("supportLoadError")} retryLabel={translate("retry")} onRetry={() => { void auth.refetch(); void conversations.refetch(); }} busy={auth.isFetching || conversations.isFetching} />
    </CustomerScreen>;
  }
  if (!auth.data) {
    return <CustomerScreen showNavigation={false}>
      <AppHeader title={translate("supportTitle")} />
      <Caption>{translate("supportLoginHint")}</Caption>
      <Button label={translate("login")} onPress={() => router.push("/login")} fullWidth />
    </CustomerScreen>;
  }

  return (
    <CustomerScreen showNavigation={false} onRefresh={() => { void conversations.refetch(); }} refreshing={conversations.isFetching}>
      <PressableSurface accessibilityRole="button" accessibilityLabel={translate("back")} onPress={() => router.back()} style={styles.backButton}>
        <Icon name="chevron-right" size={22} color={theme.colors.foreground} />
      </PressableSurface>
      <AppHeader title={translate("supportTitle")} />
      <View style={styles.hero}>
        <View style={styles.heroMark}><Icon name="message-circle" size={28} color={theme.colors.foreground} /></View>
        <Heading level={2}>{translate("supportHeadline")}</Heading>
        <Caption>{translate("supportSubtitle")}</Caption>
      </View>

      <View style={styles.section}>
        <Heading level={3}>{translate("supportNewMessage")}</Heading>
        <TextInput
          value={subject}
          onChangeText={setSubject}
          placeholder={translate("supportSubjectPlaceholder")}
          placeholderTextColor={theme.colors.subtle}
          maxLength={120}
          style={styles.input}
          accessibilityLabel={translate("supportSubjectPlaceholder")}
        />
        <TextInput
          value={message}
          onChangeText={setMessage}
          placeholder={translate("supportMessagePlaceholder")}
          placeholderTextColor={theme.colors.subtle}
          maxLength={4000}
          multiline
          textAlignVertical="top"
          style={[styles.input, styles.messageInput]}
          accessibilityLabel={translate("supportMessagePlaceholder")}
        />
        {formError ? <UiText tone="danger">{translate("supportSendError")}</UiText> : null}
        <Button
          label={translate("supportSend")}
          onPress={() => createMutation.mutate()}
          loading={createMutation.isPending}
          disabled={subject.trim().length < 3 || message.trim().length === 0}
          fullWidth
        />
      </View>

      <View style={styles.section}>
        <Heading level={3}>{translate("supportConversations")}</Heading>
        {(conversations.data ?? []).length === 0 ? (
          <EmptyState icon="message-circle" title={translate("supportEmpty")} hint={translate("supportEmptyHint")} />
        ) : (conversations.data ?? []).map((item) => (
          <PressableSurface key={item.id} onPress={() => router.push("/support/" + item.id)} style={styles.conversation}>
            <View style={styles.conversationTop}>
              <UiText weight="700" style={styles.conversationSubject}>{item.subject}</UiText>
              <View style={[styles.status, { backgroundColor: item.status === "open" ? theme.colors.accent : theme.colors.surfaceMuted }]}>
                <Caption style={{ color: theme.colors.foreground }}>{item.status === "open" ? translate("supportStatusOpen") : translate("supportStatusClosed")}</Caption>
              </View>
            </View>
            <Caption>{dateLabel(item.last_message_at, language)}</Caption>
          </PressableSurface>
        ))}
      </View>
    </CustomerScreen>
  );
}

function createStyles(theme: ReturnType<typeof useAppTheme>) {
  return StyleSheet.create({
    backButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center", alignSelf: "flex-start", borderRadius: designTokens.radius.md },
    hero: { alignItems: "flex-start", gap: designTokens.spacing.sm, paddingVertical: designTokens.spacing.lg },
    heroMark: { width: 54, height: 54, borderRadius: designTokens.radius.lg, backgroundColor: theme.colors.accent, alignItems: "center", justifyContent: "center", marginBottom: designTokens.spacing.sm },
    section: { gap: designTokens.spacing.md },
    input: { minHeight: 52, borderWidth: 1, borderColor: theme.colors.border, borderRadius: designTokens.radius.md, paddingHorizontal: designTokens.spacing.md, paddingVertical: designTokens.spacing.md, color: theme.colors.foreground, backgroundColor: theme.colors.surface, textAlign: "auto", fontFamily: "IBMPlexSansArabic" },
    messageInput: { minHeight: 120 },
    conversation: { paddingVertical: designTokens.spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: theme.colors.border, gap: designTokens.spacing.xs },
    conversationTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: designTokens.spacing.sm },
    conversationSubject: { flex: 1 },
    status: { borderRadius: designTokens.radius.pill, paddingHorizontal: designTokens.spacing.sm, paddingVertical: 4 }
  });
}
