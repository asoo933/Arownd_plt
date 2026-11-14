import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { StyleSheet, View } from "react-native";

import { BottomSheet, Button, Caption, PressableSurface, Text as UiText, TextField } from "@/components/ui";
import { submitContentReport, type ContentReportInput } from "@/lib/content-reports";
import { translate } from "@/lib/i18n";
import { designTokens, useAppTheme } from "@/lib/theme";

type ReportTargetType = ContentReportInput["targetType"];
type ReportReason = ContentReportInput["reason"];

const REASONS: ReportReason[] = ["spam", "harassment", "hate", "sexual_content", "scam", "other"];
const REASON_LABELS: Record<ReportReason, string> = {
  spam: translate("contentReportReason_spam"),
  harassment: translate("contentReportReason_harassment"),
  hate: translate("contentReportReason_hate"),
  sexual_content: translate("contentReportReason_sexual_content"),
  scam: translate("contentReportReason_scam"),
  other: translate("contentReportReason_other")
};

export function ContentReportAction({
  targetType,
  targetId,
  compact = false
}: {
  targetType: ReportTargetType;
  targetId: string;
  compact?: boolean;
}) {
  const theme = useAppTheme();
  const styles = createStyles(theme);
  const [visible, setVisible] = useState(false);
  const [reason, setReason] = useState<ReportReason>("other");
  const [details, setDetails] = useState("");
  const report = useMutation({
    mutationFn: () => submitContentReport({ targetType, targetId, reason, details })
  });

  const close = () => {
    if (report.isPending) return;
    setVisible(false);
    setDetails("");
    setReason("other");
    report.reset();
  };

  return (
    <>
      <Button
        label={translate("contentReportAction")}
        variant="outline"
        size={compact ? "sm" : "md"}
        onPress={() => setVisible(true)}
      />
      <BottomSheet visible={visible} onRequestClose={close}>
        <UiText weight="800">{translate("contentReportTitle")}</UiText>
        <Caption>{translate("contentReportHint")}</Caption>
        <View style={styles.reasons}>
          {REASONS.map((item) => (
            <PressableSurface
              key={item}
              accessibilityRole="button"
              accessibilityState={{ selected: reason === item }}
              onPress={() => setReason(item)}
              style={[styles.reason, reason === item && styles.reasonSelected]}
            >
              <UiText weight={reason === item ? "700" : "500"}>{REASON_LABELS[item]}</UiText>
            </PressableSurface>
          ))}
        </View>
        <TextField
          value={details}
          onChangeText={setDetails}
          multiline
          maxLength={1000}
          placeholder={translate("contentReportDetailsPlaceholder")}
          style={styles.details}
        />
        {report.isError ? <UiText style={styles.error}>{translate("contentReportError")}</UiText> : null}
        {report.isSuccess ? <UiText style={styles.success}>{translate("contentReportSuccess")}</UiText> : null}
        <Button
          label={translate("contentReportSubmit")}
          onPress={() => report.mutate()}
          loading={report.isPending}
          disabled={report.isPending || report.isSuccess}
          fullWidth
        />
        <Button label={translate("back")} variant="ghost" onPress={close} disabled={report.isPending} fullWidth />
      </BottomSheet>
    </>
  );
}

function createStyles(theme: ReturnType<typeof useAppTheme>) {
  return StyleSheet.create({
    reasons: { gap: designTokens.spacing.xs },
    reason: {
      minHeight: 42,
      justifyContent: "center",
      paddingHorizontal: designTokens.spacing.md,
      borderRadius: theme.radius.md,
      backgroundColor: theme.colors.surfaceSecondary,
      borderWidth: 1,
      borderColor: theme.colors.border
    },
    reasonSelected: {
      backgroundColor: theme.colors.accent,
      borderColor: theme.colors.accent
    },
    details: {
      minHeight: 88,
      textAlign: "auto",
      textAlignVertical: "top"
    },
    error: { color: theme.colors.danger },
    success: { color: theme.colors.success }
  });
}
