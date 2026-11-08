import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { CustomerScreen, EmptyState, ErrorState, LoadingState } from "@/components/customer-ui";
import { AppHeader, Button, IconButton, PressableSurface, StatusBadge } from "@/components/ui";
import { fetchMyReviews, getReviewTargetPath, type AppReview } from "@/lib/reviews";
import { translate } from "@/lib/i18n";
import { getSupabaseClient } from "@/lib/supabase";
import { useAppTheme } from "@/lib/theme";

export default function MyReviewsScreen() {
  const theme = useAppTheme();
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
      <AppHeader title={translate("myReviewsTitle")} leading={<IconButton accessibilityLabel={translate("back")} onPress={() => router.back()} icon={<Text style={{ color: theme.colors.foreground, fontSize: 24 }}>‹</Text>} />} />
      <Text style={{ color: theme.colors.muted, fontSize: 12, textAlign: "right" }}>{translate("myReviewsSubtitle")}</Text>
      {auth.isPending || (auth.data && query.isPending) ? <LoadingState label={translate("stateLoading")} /> : null}
      {auth.isError || query.isError ? (
        <ErrorState title={translate("myReviewsLoadError")} retryLabel={translate("retry")} onRetry={() => { void auth.refetch(); void query.refetch(); }} />
      ) : null}
      {auth.isSuccess && !auth.data ? (
        <Button label={translate("profileLogin")} onPress={() => router.push("/login")} fullWidth />
      ) : null}
      {query.isSuccess && query.data.length === 0 ? (
        <EmptyState title={translate("myReviewsEmpty")} hint={translate("myReviewsEmptyHint")} />
      ) : null}
      {query.data?.map(review => (
        <ReviewRow key={review.id} review={review} onPress={() => router.push(getReviewTargetPath(review) as never)} />
      ))}
    </CustomerScreen>
  );
}

function ReviewRow({ review, onPress }: { review: AppReview; onPress: () => void }) {
  const theme = useAppTheme();
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
    <PressableSurface accessibilityRole="button" accessibilityLabel={target} onPress={onPress} style={[styles.row, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
      <View style={styles.rowHeader}>
        <Text style={[styles.target, { color: theme.colors.foreground }]}>{target}</Text>
        <Text style={[styles.rating, { color: theme.colors.warning }]}>{review.rating}/5 ★</Text>
      </View>
      {review.comment ? <Text style={[styles.comment, { color: theme.colors.muted }]}>{review.comment}</Text> : null}
      <View style={styles.rowFooter}>
        <StatusBadge label={status} tone={review.status === "rejected" ? "danger" : review.status === "approved" ? "success" : "warning"} />
        <Text style={[styles.date, { color: theme.colors.muted }]}>{dateLabel}</Text>
      </View>
    </PressableSurface>
  );
}

const styles = StyleSheet.create({
  row: { borderWidth: 1, borderRadius: 16, padding: 14, gap: 9 },
  rowHeader: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center" },
  target: { fontSize: 14, fontWeight: "900" },
  rating: { fontSize: 13, fontWeight: "900" },
  comment: { fontSize: 12, lineHeight: 19, textAlign: "right" },
  rowFooter: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center" },
  date: { fontSize: 10 }
});
