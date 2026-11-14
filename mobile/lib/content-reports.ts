import { z } from "zod";

import { assertActionRateLimit } from "@/lib/action-rate-limit";
import { getSupabaseClient } from "@/lib/supabase";

export const contentReportSchema = z.object({
  targetType: z.enum(["review", "product", "store"]),
  targetId: z.string().uuid(),
  reason: z.enum(["spam", "harassment", "hate", "sexual_content", "scam", "other"]),
  details: z.string().trim().max(1000)
});

export type ContentReportInput = z.infer<typeof contentReportSchema>;

export async function submitContentReport(input: ContentReportInput): Promise<string> {
  const parsed = contentReportSchema.parse(input);
  assertActionRateLimit("content-report:" + parsed.targetType + ":" + parsed.targetId, 30_000);

  const { data, error } = await getSupabaseClient().rpc("submit_content_report", {
    _target_type: parsed.targetType,
    _target_id: parsed.targetId,
    _reason: parsed.reason,
    _details: parsed.details.trim() || null
  });

  if (error) throw new Error(error.message || "content_report_failed");
  return z.string().uuid().parse(data);
}
