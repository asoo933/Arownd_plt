import { toast } from "sonner";
import { translate } from "@/lib/i18n";

type FeedbackKey =
  | "feedback_generic_error"
  | "feedback_network_error"
  | "feedback_session_error"
  | "feedback_permission_error"
  | "feedback_duplicate_error"
  | "feedback_validation_error"
  | "feedback_stock_error"
  | "feedback_upload_error";

/**
 * Converts infrastructure/database errors into short, actionable messages.
 * Original errors should still be sent to console by the caller when debugging is needed.
 */
export function friendlyErrorMessage(
  error: unknown,
  fallback: FeedbackKey = "feedback_generic_error",
) {
  const message = error instanceof Error ? error.message : String(error ?? "");
  const normalized = message.toLowerCase();
  if (normalized === "notification_delete_not_confirmed") {
    return translate("notifications_delete_not_confirmed");
  }

  if (
    (typeof navigator !== "undefined" && !navigator.onLine) ||
    /failed to fetch|networkerror|network request failed|fetch failed|timeout|timed out|connection/i.test(
      normalized,
    )
  ) {
    return translate("feedback_network_error");
  }

  if (
    /jwt expired|token expired|invalid jwt|session.*missing|not authenticated|auth session missing/i.test(
      normalized,
    )
  ) {
    return translate("feedback_session_error");
  }
  if (
    /permission denied|row-level security|rls|not authorized|insufficient privilege|42501/i.test(
      normalized,
    )
  ) {
    return translate("feedback_permission_error");
  }
  if (/duplicate key|already exists|unique constraint|23505/i.test(normalized)) {
    return translate("feedback_duplicate_error");
  }
  if (
    /out of stock|insufficient stock|stock.*(not enough|insufficient)|quantity unavailable/i.test(
      normalized,
    )
  ) {
    return translate("feedback_stock_error");
  }
  if (
    /storage.*(upload|object)|file too large|payload too large|unsupported.*file|invalid mime/i.test(
      normalized,
    )
  ) {
    return translate("feedback_upload_error");
  }
  if (
    /invalid input|validation|violates.*constraint|not-null constraint|23502|22p02/i.test(
      normalized,
    )
  ) {
    return translate("feedback_validation_error");
  }

  // Never expose raw SQL, PostgREST codes, URLs, or provider diagnostics.
  if (/\b(pgrst\d+|postgrest|postgres|supabase|sqlstate|\b\d{5}\b|https?:\/\/)/i.test(message)) {
    return translate(fallback);
  }

  // Keep short, human-written application messages; replace technical or oversized text.
  if (
    message &&
    message.length <= 120 &&
    !/[{}<>]/.test(message) &&
    !/error:|exception:|failed to/i.test(message)
  ) {
    return message;
  }
  return translate(fallback);
}

export function showError(error: unknown, fallback: FeedbackKey = "feedback_generic_error") {
  toast.error(friendlyErrorMessage(error, fallback));
}

export function showSuccess(message: string) {
  toast.success(message);
}
