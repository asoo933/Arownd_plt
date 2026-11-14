import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";
import { Linking, StyleSheet, View } from "react-native";

import { CustomerScreen, ErrorState, LoadingState } from "@/components/customer-ui";
import { Alert, AppHeader, Button, Caption, ConfirmDialog, Heading, Icon, PressableSurface, Text as UiText } from "@/components/ui";
import { cancelMyAccountDeletion, fetchMyAccountDeletionRequest, requestMyAccountDeletion } from "@/lib/account-deletion";
import { translate } from "@/lib/i18n";
import { designTokens, useAppTheme } from "@/lib/theme";
import { useLanguage } from "@/lib/i18n";

export default function DeleteAccountScreen() {
  const theme = useAppTheme();
  const { language } = useLanguage();
  const queryClient = useQueryClient();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const request = useQuery({
    queryKey: ["account-deletion-request"],
    queryFn: fetchMyAccountDeletionRequest,
    retry: false
  });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["account-deletion-request"] });
  const createRequest = useMutation({
    mutationFn: requestMyAccountDeletion,
    onSuccess: refresh
  });
  const cancelRequest = useMutation({
    mutationFn: cancelMyAccountDeletion,
    onSuccess: refresh
  });
  const active = request.data && ["pending", "under_review", "blocked"].includes(request.data.status);

  return (
    <CustomerScreen showNavigation={false} contentStyle={styles.content}>
      <AppHeader
        title={translate("deleteAccountTitle")}
        leading={
          <PressableSurface accessibilityRole="button" accessibilityLabel={translate("back")} onPress={() => router.back()}>
            <Icon name="chevron-right" size={22} color={theme.colors.foreground} />
          </PressableSurface>
        }
      />
      <Heading level={2}>{translate("deleteAccountHeading")}</Heading>
      <Caption>{translate("deleteAccountDescription")}</Caption>
      <Alert tone="warning" description={translate("deleteAccountRetentionNotice")} />

      {request.isPending ? <LoadingState label={translate("stateLoading")} /> : null}
      {request.isError ? (
        <ErrorState
          title={translate("deleteAccountLoadError")}
          retryLabel={translate("retry")}
          busy={request.isFetching}
          onRetry={() => void request.refetch()}
        />
      ) : null}

      {request.isSuccess && active ? (
        <View style={styles.statusCard}>
          <UiText weight="800">{translate("deleteAccountRequestPending")}</UiText>
          <Caption>{translate("deleteAccountRequestedAt")}: {new Intl.DateTimeFormat(language === "ar" ? "ar-DZ" : "en-DZ", { dateStyle: "medium" }).format(new Date(request.data.requested_at))}</Caption>
          <Button
            label={translate("deleteAccountCancel")}
            variant="outline"
            loading={cancelRequest.isPending}
            disabled={cancelRequest.isPending}
            onPress={() => cancelRequest.mutate(request.data!.id)}
            fullWidth
          />
        </View>
      ) : null}

      {request.isSuccess && !active && request.data?.status === "completed" ? (
        <Alert tone="success" description={translate("deleteAccountCompleted")} />
      ) : null}

      {request.isSuccess && !active ? (
        <Button
          label={translate("deleteAccountRequest")}
          variant="danger"
          fullWidth
          loading={createRequest.isPending}
          disabled={createRequest.isPending}
          onPress={() => setConfirmOpen(true)}
        />
      ) : null}

      {createRequest.isError || cancelRequest.isError ? (
        <Alert tone="danger" description={translate("deleteAccountActionError")} />
      ) : null}

      <Caption>{translate("deleteAccountEmailHelp")}</Caption>
      <Button
        label={translate("deleteAccountEmail")}
        variant="outline"
        fullWidth
        onPress={() => {
          void Linking.openURL("mailto:arownddz@gmail.com?subject=Arownd%20account%20deletion%20request");
        }}
      />

      <ConfirmDialog
        visible={confirmOpen}
        onRequestClose={() => setConfirmOpen(false)}
        onConfirm={() => {
          setConfirmOpen(false);
          createRequest.mutate();
        }}
        title={translate("deleteAccountConfirmTitle")}
        description={translate("deleteAccountConfirmDescription")}
        cancelLabel={translate("back")}
        confirmLabel={translate("deleteAccountRequest")}
        destructive
        busy={createRequest.isPending}
      />
    </CustomerScreen>
  );
}

const styles = StyleSheet.create({
  content: { gap: designTokens.spacing.md },
  statusCard: { gap: designTokens.spacing.md, padding: designTokens.spacing.md, borderRadius: 16, borderWidth: 1, borderColor: "#D5D5D5" }
});
