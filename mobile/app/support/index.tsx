import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { StyleSheet, TextInput, View } from "react-native";

import { CustomerScreen, EmptyState, ErrorState, LoadingState } from "@/components/customer-ui";
import { AppHeader, Button, Caption, Heading, Icon, PressableSurface, Text as UiText } from "@/components/ui";
import { createSupportConversation, fetchMySupportConversations, supportConversationInputSchema, type SupportConversationInput } from "@/lib/support";
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
  const [formError, setFormError] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState<string | null>(null);
  const { control, handleSubmit, reset, formState: { errors, isValid } } = useForm<SupportConversationInput>({
    resolver: zodResolver(supportConversationInputSchema),
    defaultValues: { subject: "", message: "" },
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
    mutationFn: (values: SupportConversationInput) => createSupportConversation(values.subject, values.message),
    onSuccess: async (id) => {
      reset({ subject: "", message: "" });
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
        <Heading level={3}>{translate("supportFaqTitle")}</Heading>
        {[
          { id: "orders", question: translate("supportFaqOrdersQuestion"), answer: translate("supportFaqOrdersAnswer") },
          { id: "payment", question: translate("supportFaqPaymentQuestion"), answer: translate("supportFaqPaymentAnswer") },
          { id: "addresses", question: translate("supportFaqAddressesQuestion"), answer: translate("supportFaqAddressesAnswer") },
          { id: "notifications", question: translate("supportFaqNotificationsQuestion"), answer: translate("supportFaqNotificationsAnswer") }
        ].map((item) => {
          const expanded = expandedFaq === item.id;
          return (
            <PressableSurface
              key={item.id}
              onPress={() => setExpandedFaq(expanded ? null : item.id)}
              style={styles.faqItem}
              accessibilityRole="button"
              accessibilityLabel={item.question}
            >
              <View style={styles.faqHeader}>
                <UiText weight="700" style={styles.faqQuestion}>{item.question}</UiText>
                <Icon name={expanded ? "chevron-down" : "chevron-left"} size={18} color={theme.colors.foregroundSecondary} />
              </View>
              {expanded ? <Caption>{item.answer}</Caption> : null}
            </PressableSurface>
          );
        })}
      </View>

      <View style={styles.section}>
        <Heading level={3}>{translate("supportNewMessage")}</Heading>
        <Controller
          control={control}
          name="subject"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              placeholder={translate("supportSubjectPlaceholder")}
              placeholderTextColor={theme.colors.subtle}
              maxLength={120}
              style={styles.input}
              accessibilityLabel={translate("supportSubjectPlaceholder")}
            />
          )}
        />
        {errors.subject ? <UiText tone="danger">{translate("supportSubjectInvalid")}</UiText> : null}
        <Controller
          control={control}
          name="message"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              placeholder={translate("supportMessagePlaceholder")}
              placeholderTextColor={theme.colors.subtle}
              maxLength={4000}
              multiline
              textAlignVertical="top"
              style={[styles.input, styles.messageInput]}
              accessibilityLabel={translate("supportMessagePlaceholder")}
            />
          )}
        />
        {errors.message ? <UiText tone="danger">{translate("supportMessageInvalid")}</UiText> : null}
        {formError ? <UiText tone="danger">{translate("supportSendError")}</UiText> : null}
        <Button
          label={translate("supportSend")}
          onPress={() => { void handleSubmit((values) => createMutation.mutate(values))(); }}
          loading={createMutation.isPending}
          disabled={!isValid}
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
    faqItem: { paddingVertical: designTokens.spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: theme.colors.border, gap: designTokens.spacing.sm },
    faqHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: designTokens.spacing.md },
    faqQuestion: { flex: 1 },
    input: { minHeight: 52, borderWidth: 1, borderColor: theme.colors.border, borderRadius: designTokens.radius.md, paddingHorizontal: designTokens.spacing.md, paddingVertical: designTokens.spacing.md, color: theme.colors.foreground, backgroundColor: theme.colors.surface, textAlign: "auto", fontFamily: theme.fontFamilies.arabic },
    messageInput: { minHeight: 120 },
    conversation: { paddingVertical: designTokens.spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: theme.colors.border, gap: designTokens.spacing.xs },
    conversationTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: designTokens.spacing.sm },
    conversationSubject: { flex: 1 },
    status: { borderRadius: designTokens.radius.pill, paddingHorizontal: designTokens.spacing.sm, paddingVertical: 4 }
  });
}
