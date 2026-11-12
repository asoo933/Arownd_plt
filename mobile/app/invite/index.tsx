import { useMemo } from "react";
import { Share, StyleSheet, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import * as Linking from "expo-linking";
import { router } from "expo-router";

import { CustomerScreen, ErrorState, LoadingState } from "@/components/customer-ui";
import {
  AppHeader,
  Button,
  Caption,
  Card,
  Heading,
  Icon,
  IconButton,
  PressableSurface,
  Text as UiText
} from "@/components/ui";
import { designTokens, useAppTheme } from "@/lib/theme";
import { fetchMyInviteOverview } from "@/lib/arownd-invite";
import { formatInviteCode } from "@/lib/invite-code";
import { getProfileInitial } from "@/lib/profile-state";
import { translate, useLanguage } from "@/lib/i18n";

export default function InviteScreen() {
  const theme = useAppTheme();
  const { language } = useLanguage();
  const styles = createStyles(theme);
  const invite = useQuery({
    queryKey: ["my-invite-overview"],
    queryFn: fetchMyInviteOverview,
    retry: false
  });

  const inviteLink = useMemo(
    () => invite.data
      ? Linking.createURL(`invite/${invite.data.code}`, { scheme: "com.arownd.app" })
      : "",
    [invite.data]
  );

  const share = async (message: string) => {
    try {
      await Share.share({ message });
    } catch {
      // The native share sheet may be unavailable on restricted devices.
    }
  };

  const formatDate = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleDateString(language === "ar" ? "ar-DZ" : "en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric"
    });
  };

  return (
    <CustomerScreen
      refreshing={invite.isFetching && !invite.isPending}
      onRefresh={() => { void invite.refetch(); }}
    >
      <AppHeader
        title={translate("inviteTitle")}
        leading={
          <IconButton
            icon={<Icon name="chevron-right" size={20} />}
            accessibilityLabel={translate("back")}
            onPress={() => router.back()}
          />
        }
      />

      {invite.isPending ? (
        <LoadingState label={translate("stateLoading")} />
      ) : invite.isError || !invite.data ? (
        <ErrorState
          title={translate("inviteLoadError")}
          retryLabel={translate("retry")}
          busy={invite.isFetching}
          onRetry={() => { void invite.refetch(); }}
        />
      ) : (
        <>
          <View style={styles.summary}>
            <View style={styles.summaryCopy}>
              <Caption>{translate("inviteSuccessfulCount")}</Caption>
              <Heading level={1} style={styles.count}>{String(invite.data.total)}</Heading>
            </View>
            <View style={styles.summaryIcon}>
              <Icon name="user" size={22} color={theme.colors.accentForeground} />
            </View>
          </View>

          <Card contentStyle={styles.codeCard}>
            <Caption>{translate("inviteCodeLabel")}</Caption>
            <UiText weight="800" style={styles.codeText}>{formatInviteCode(invite.data.code)}</UiText>
            <Button
              label={translate("inviteShareCode")}
              variant="outline"
              fullWidth
              startIcon={<Icon name="share" size={17} />}
              onPress={() => {
                void share(`${translate("inviteShareCodeMessage")}\n${formatInviteCode(invite.data.code)}\n${inviteLink}`);
              }}
            />
          </Card>

          <View style={styles.linkSection}>
            <Caption>{translate("inviteLinkLabel")}</Caption>
            <View style={styles.linkRow}>
              <View style={styles.linkCopy}>
                <UiText numberOfLines={2} style={styles.linkText}>{inviteLink}</UiText>
              </View>
              <Icon name="share" size={18} color={theme.colors.muted} />
            </View>
            <Button
              label={translate("inviteShare")}
              fullWidth
              startIcon={<Icon name="share" size={17} />}
              onPress={() => {
                void share(`${translate("inviteShareMessage")}\n${inviteLink}`);
              }}
            />
          </View>

          <View style={styles.historyHeader}>
            <Heading level={3}>{translate("inviteHistoryTitle")}</Heading>
            <UiText weight="700" style={styles.historyCount}>{String(invite.data.total)}</UiText>
          </View>

          {invite.data.referrals.length === 0 ? (
            <View style={styles.emptyState}>
              <Icon name="user" size={22} color={theme.colors.subtle} />
              <UiText weight="600">{translate("inviteEmpty")}</UiText>
              <Caption>{translate("inviteEmptyHint")}</Caption>
            </View>
          ) : (
            <View style={styles.inviteeList}>
              {invite.data.referrals.map((item) => {
                const displayName = item.displayName ?? translate("invitePrivateMember");
                return (
                  <View key={item.id} style={styles.inviteeRow}>
                    <View style={styles.avatar}>
                      <UiText weight="700" style={styles.avatarText}>
                        {getProfileInitial(displayName)}
                      </UiText>
                    </View>
                    <View style={styles.inviteeInfo}>
                      <UiText weight="600" numberOfLines={1}>{displayName}</UiText>
                      <Caption>{formatDate(item.createdAt)}</Caption>
                    </View>
                    <Icon name="circle-check" size={18} color={theme.colors.success} />
                  </View>
                );
              })}
            </View>
          )}
        </>
      )}
    </CustomerScreen>
  );
}

function createStyles(theme: ReturnType<typeof useAppTheme>) {
  return StyleSheet.create({
    summary: {
      minHeight: 104,
      borderRadius: theme.radius.xl,
      backgroundColor: theme.colors.accent,
      padding: designTokens.spacing.lg,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between"
    },
    summaryCopy: { gap: designTokens.spacing.xs, alignItems: "flex-start" },
    count: { color: theme.colors.accentForeground, fontSize: 34, lineHeight: 40 },
    summaryIcon: {
      width: 44,
      height: 44,
      borderRadius: theme.radius.md,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.accentMuted
    },
    codeCard: { padding: designTokens.spacing.lg, gap: designTokens.spacing.md },
    codeText: {
      color: theme.colors.foreground,
      fontSize: 23,
      letterSpacing: 1.2,
      textAlign: "left",
      writingDirection: "ltr",
      includeFontPadding: false
    },
    linkSection: { gap: designTokens.spacing.sm },
    linkRow: {
      minHeight: 52,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.radius.md,
      backgroundColor: theme.colors.surface,
      paddingHorizontal: designTokens.spacing.md,
      flexDirection: "row",
      alignItems: "center",
      gap: designTokens.spacing.sm
    },
    linkCopy: { flex: 1, minWidth: 0 },
    linkText: { color: theme.colors.muted, fontSize: theme.typography.caption, writingDirection: "ltr", textAlign: "left" },
    historyHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    historyCount: { color: theme.colors.accentMuted, fontSize: theme.typography.subtitle },
    inviteeList: { gap: 0 },
    inviteeRow: {
      minHeight: 68,
      flexDirection: "row",
      alignItems: "center",
      gap: designTokens.spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.border
    },
    avatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.surfaceSecondary
    },
    avatarText: { color: theme.colors.foreground, fontSize: theme.typography.body },
    inviteeInfo: { flex: 1, minWidth: 0, gap: 2, alignItems: "flex-start" },
    emptyState: { alignItems: "center", padding: designTokens.spacing.xl, gap: designTokens.spacing.sm }
  });
}
