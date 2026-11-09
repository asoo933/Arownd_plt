import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";
import { StyleSheet, View } from "react-native";

import { EmptyState, ErrorState, LoadingState } from "@/components/customer-ui";
import { Button, RatingSelector, RatingStars, Text as UiText, TextField } from "@/components/ui";
import { fetchApprovedReviews, fetchMyReview, submitMyReview } from "@/lib/reviews";
import { getSupabaseClient } from "@/lib/supabase";
import { translate } from "@/lib/i18n";
import { useAppTheme, type AppTheme } from "@/lib/theme";

export function ReviewPanel({ targetType, targetId }: { targetType: "product" | "store"; targetId: string }) {
  const theme = useAppTheme();
  const styles = createStyles(theme);
  const queryClient = useQueryClient();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const auth = useQuery({
    queryKey: ["review-auth"],
    queryFn: async () => {
      const { data, error } = await getSupabaseClient().auth.getUser();
      if (error) throw error;
      return data.user;
    },
    retry: false
  });
  const reviews = useQuery({
    queryKey: ["approved-reviews", targetType, targetId],
    queryFn: () => fetchApprovedReviews(targetType, targetId)
  });
  const mine = useQuery({
    queryKey: ["my-review", targetType, targetId],
    queryFn: () => fetchMyReview(targetType, targetId),
    enabled: auth.isSuccess && Boolean(auth.data)
  });
  const submit = useMutation({
    mutationFn: () => submitMyReview(targetType, targetId, rating, comment),
    onSuccess: async () => {
      setComment("");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["approved-reviews", targetType, targetId] }),
        queryClient.invalidateQueries({ queryKey: ["my-review", targetType, targetId] })
      ]);
    }
  });

  return (
    <View style={[styles.panel, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
      <UiText style={[styles.heading, { color: theme.colors.foreground }]}>{translate("reviewsTitle")}</UiText>
      <UiText style={[styles.subtitle, { color: theme.colors.muted }]}>{translate("reviewsSubtitle")}</UiText>
      {auth.isPending || reviews.isPending || (auth.data && mine.isPending) ? <LoadingState label={translate("stateLoading")} /> : null}
      {reviews.isError || mine.isError || auth.isError ? (
        <ErrorState title={translate("reviewsLoadError")} retryLabel={translate("retry")} onRetry={() => {
          void auth.refetch(); void reviews.refetch(); void mine.refetch();
        }} />
      ) : null}
      {mine.data ? (
        <View style={[styles.ownReview, { backgroundColor: theme.colors.surfaceMuted }]}>
          <UiText style={[styles.ownTitle, { color: theme.colors.foreground }]}>{translate("reviewsAlreadySubmitted")} · {mine.data.rating}/5</UiText>
          {mine.data.comment ? <UiText style={[styles.body, { color: theme.colors.muted }]}>{mine.data.comment}</UiText> : null}
          <UiText style={[styles.caption, { color: theme.colors.muted }]}>{mine.data.status === "approved" ? translate("reviewsApproved") : translate("reviewsPending")}</UiText>
        </View>
      ) : auth.data ? (
        <View style={styles.form}>
          <UiText style={[styles.body, { color: theme.colors.muted }]}>{translate("reviewsEligibilityHint")}</UiText>
          <RatingSelector
            value={rating}
            onChange={setRating}
            accessibilityLabel={translate("storeRating")}
            size={42}
          />
          <TextField
            value={comment}
            onChangeText={setComment}
            multiline
            maxLength={1000}
            placeholder={translate("reviewsCommentPlaceholder")}
            textAlign="right"
            style={[styles.input, { color: theme.colors.foreground, borderColor: theme.colors.border }]}
          />
          <Button
            label={translate("reviewsSubmit")}
            onPress={() => submit.mutate()}
            loading={submit.isPending}
            disabled={submit.isPending}
            fullWidth
          />
          {submit.isError ? <UiText style={[styles.error, { color: theme.colors.danger }]}>{submit.error.message.includes("review_not_verified") ? translate("reviewsNotEligible") : translate("reviewsSubmitError")}</UiText> : null}
        </View>
      ) : auth.isSuccess ? (
        <Button label={translate("login")} onPress={() => router.push("/login")} fullWidth />
      ) : null}
      {reviews.data?.length ? reviews.data.map(item => (
        <View key={item.id} style={[styles.review, { borderTopColor: theme.colors.border }]}>
          <View style={styles.reviewHeader}>
            <UiText style={[styles.caption, { color: theme.colors.muted }]}>{new Intl.DateTimeFormat("ar-DZ", { dateStyle: "medium" }).format(new Date(item.created_at))}</UiText>
            <RatingStars value={item.rating} size={16} />
          </View>
          {item.comment ? <UiText style={[styles.body, { color: theme.colors.foreground }]}>{item.comment}</UiText> : null}
        </View>
      )) : !reviews.isPending && !reviews.isError ? <EmptyState title={translate("reviewsEmpty")} hint={translate("reviewsEmptyHint")} /> : null}
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    panel: { borderWidth: 1, borderRadius: 18, padding: 14, gap: 10 },
    heading: { fontSize: 17, fontWeight: "700", textAlign: "auto" },
    subtitle: { fontSize: 11, textAlign: "auto" },
    form: { gap: 10 },
    input: { minHeight: 88, borderWidth: 1, borderRadius: 13, padding: 12, textAlignVertical: "top", fontSize: 13 },
    error: { fontSize: 11, textAlign: "auto" },
    ownReview: { borderRadius: 13, padding: 12, gap: 6 },
    ownTitle: { fontSize: 13, fontWeight: "700", textAlign: "auto" },
    body: { fontSize: 12, lineHeight: 20, textAlign: "auto" },
    caption: { fontSize: 10 },
    review: { borderTopWidth: 1, paddingTop: 10, gap: 6 },
    reviewHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" }
  });
}
