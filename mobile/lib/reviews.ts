import { z } from "zod";
import { getSupabaseClient } from "@/lib/supabase";

const ReviewSchema = z.object({
  id: z.string(),
  target_type: z.enum(["product", "store"]),
  target_id: z.string(),
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().nullable().optional(),
  status: z.string(),
  created_at: z.string()
}).passthrough();

export type AppReview = z.infer<typeof ReviewSchema>;

export async function fetchApprovedReviews(targetType: "product" | "store", targetId: string): Promise<AppReview[]> {
  const { data, error } = await getSupabaseClient().from("reviews")
    .select("id, target_type, target_id, rating, comment, status, created_at")
    .eq("target_type", targetType).eq("target_id", targetId).eq("status", "approved")
    .order("created_at", { ascending: false }).limit(30);
  if (error) throw error;
  return ReviewSchema.array().parse(data as unknown);
}

export async function fetchMyReview(targetType: "product" | "store", targetId: string): Promise<AppReview | null> {
  const client = getSupabaseClient();
  const { data: auth, error: authError } = await client.auth.getUser();
  if (authError) throw authError;
  if (!auth.user) return null;
  const { data, error } = await client.from("reviews")
    .select("id, target_type, target_id, rating, comment, status, created_at")
    .eq("target_type", targetType).eq("target_id", targetId).eq("user_id", auth.user.id).maybeSingle();
  if (error) throw error;
  return data ? ReviewSchema.parse(data as unknown) : null;
}

export async function submitMyReview(targetType: "product" | "store", targetId: string, rating: number, comment: string): Promise<AppReview> {
  if (!isValidReviewRating(rating)) throw new Error("invalid_rating");
  const args: { _target_type: "product" | "store"; _target_id: string; _rating: number; _comment?: string } = {
    _target_type: targetType, _target_id: targetId, _rating: rating
  };
  if (comment.trim()) args._comment = comment.trim();
  const { data, error } = await getSupabaseClient().rpc("submit_review", args);
  if (error) throw new Error(error.message || "review_submission_failed");
  return ReviewSchema.parse(data as unknown);
}

export function isValidReviewRating(rating: number): boolean {
  return Number.isInteger(rating) && rating >= 1 && rating <= 5;
}
