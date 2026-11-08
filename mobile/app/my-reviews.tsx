import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { StyleSheet, View } from "react-native";

import { designTokens, useAppTheme, type AppTheme } from "@/lib/theme";
import { CustomerScreen, EmptyState, ErrorState, LoadingState } from "@/components/customer-ui";
import {
  AppHeader,
  Button,
  Caption,
  Card,
  Icon,
  IconButton,
  RatingStars,
  StatusBadge,
  Text as UiText
} from "@/components/ui";
import { fetchMyReviews, getReviewTargetPath, type AppReview } from "@/lib/reviews";
import { translate } from "@/lib/i18n";
import { getSupabaseClient } from "@/lib/supabase";

export default function MyReviewsScreen() {
  const auth = useQuery({
    queryKey: ["my-reviews-auth"],
    queryFn: async () => {
      const { data, error } = await getSupabaseClient().auth.getUser();
      if (error) throw error;
      return data.user;
    },
    retry: false
  });
  const query = useQuery({
    queryKey: ["my-reviews"],
    queryFn: fetchMyReviews,
    enabled: auth.isSuccess && Boolean(auth.data),
    retry: false
  });

  return (
    <CustomerScreen>
      <AppHeader
        title={translate("myReviewsTitle")}
        leading={<IconButton accessibilityLabel={translate("back")} onPress={() => router.back()} icon={<Icon name="chevron-left" size={20} />} />}
      />
      <Caption>{translate("myReviewsSubtitle")}</Caption>
      {auth.isPending || (auth.data && query.isPending) ? <LoadingState label={translate("stateLoading")} /> : null}
      {auth.isError || query.isError ? (
        <ErrorState
          title={translate("myReviewsLoadError")}
          retryLabel={translate("retry")}
          onRetry={() => { void auth.refetch(); void query.refetch(); }}
        />
      ) : null}
      {auth.isSuccess && !auth.data ? (
        <Button label={translate("profileLogin")} onPress={() => router.push("/login")} fullWidth />
      ) : null}
      {query.isSuccess && query.data.length === 0 ? (
        <EmptyState title={translate("myReviewsEmpty")} hint={translate("myReviewsEmptyHint")} />
      ) : null}
      {query.data?.map((review) => (
        <ReviewRow key={review.id} review={review} onPress={() => router.push(getReviewTargetPath(review) as never)} />
      ))}
    </CustomerScreen>
  );
}

function ReviewRow({ review, onPress }: { review: AppReview; onPress: () => void }) {
  const theme = useAppTheme();
  const styles = createReviewStyles(theme);
  const status = review.status === "approved"
    ? translate("myReviewsApproved")
    : review.status === "rejected"
      ? translate("myReviewsRejected")
      : translate("myReviewsPending");
  const target = review.target_type === "product"
    ? translate("myReviewsProduct")
    : translate("myReviewsStore");
  const date = new Date(review.created_at);
  const dateLabel = Number.isNaN(date.getTime())
    ? ""
    : new Intl.DateTimeFormat("ar-DZ", { dateStyle: "medium" }).format(date);

  return (
    <Card
      onPress={onPress}
      accessibilityLabel={target}
      style={styles.card}
      contentStyle={styles.cardContent}
    >
      <View style={styles.rowHeader}>
        <UiText weight="800" style={styles.targetLabel}>{target}</UiText>
        <RatingStars value={review.rating} size={15} showValue />
      </View>
      {review.comment ? <UiText tone="muted" style={styles.comment}>{review.comment}</UiText> : null}
      <View style={styles.rowFooter}>
        <StatusBadge
          label={status}
          tone={review.status === "rejected" ? "danger" : review.status === "approved" ? "success" : "warning"}
        />
        <Caption>{dateLabel}</Caption>
      </View>
    </Card>
  );
}

function createReviewStyles(theme: AppTheme) {
  return StyleSheet.create({
    card: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: designTokens.radius.lg
    },
    cardContent: {
      gap: designTokens.spacing.md,
      padding: designTokens.spacing.lg
    },
    rowHeader: {
      flexDirection: "row-reverse",
      justifyContent: "space-between",
      alignItems: "center",
      gap: designTokens.spacing.md
    },
    targetLabel: { color: theme.colors.foreground },
    comment: { lineHeight: designTokens.typography.body * 1.6 },
    rowFooter: {
      flexDirection: "row-reverse",
      justifyContent: "space-between",
      alignItems: "center",
      gap: designTokens.spacing.md,
      paddingTop: designTokens.spacing.sm,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.border
    }
  });
}
