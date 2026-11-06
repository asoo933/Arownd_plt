import { useState } from "react";
import { Flag } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { showError, showSuccess } from "@/lib/feedback";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type ReportTarget = "review" | "product" | "store" | "user";

const reasons = [
  { value: "spam", label: "محتوى مزعج أو رسائل غير مرغوبة" },
  { value: "harassment", label: "إساءة أو مضايقة" },
  { value: "hate", label: "خطاب كراهية" },
  { value: "sexual_content", label: "محتوى غير لائق" },
  { value: "scam", label: "احتيال أو معلومات مضللة" },
  { value: "other", label: "سبب آخر" },
] as const;

export function ReportContentButton({
  targetType,
  targetId,
  label = "الإبلاغ عن المحتوى",
}: {
  targetType: ReportTarget;
  targetId: string;
  label?: string;
}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<(typeof reasons)[number]["value"]>("other");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!user) {
      setOpen(false);
      navigate({ to: "/auth", search: { redirect: window.location.pathname } });
      return;
    }
    if (busy) return;
    setBusy(true);
    try {
      const { error } = await supabase.rpc("submit_content_report", {
        _target_type: targetType,
        _target_id: targetId,
        _reason: reason,
        _details: details.trim() || undefined,
      });
      if (error) {
        if (error.code === "23505") {
          toast.info("سبق أن أرسلت بلاغاً عن هذا المحتوى.");
          setOpen(false);
          return;
        }
        throw error;
      }
      showSuccess("تم استلام البلاغ. سيقوم فريق Arownd بمراجعته.");
      setDetails("");
      setOpen(false);
    } catch (error) {
      const message = (error as { message?: string })?.message ?? "";
      if (message.includes("report_rate_limit_exceeded")) {
        toast.error("وصلت إلى الحد اليومي للبلاغات. حاول مجددًا لاحقًا.");
      } else {
        showError(error);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-9 items-center gap-1.5 rounded-full px-2 text-xs font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={label}
      >
        <Flag className="size-3.5" />
        <span>{label}</span>
      </button>
      <Dialog open={open} onOpenChange={(next) => !busy && setOpen(next)}>
        <DialogContent dir="rtl" className="max-w-sm">
          <DialogHeader>
            <DialogTitle>الإبلاغ عن المحتوى</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm leading-6 text-muted-foreground">
              تساعدنا البلاغات على مراجعة المحتوى والتعامل مع المخالفات. لن يظهر بلاغك للناشر.
            </p>
            <div className="space-y-2">
              <label htmlFor="content-report-reason" className="text-sm font-semibold">
                سبب البلاغ
              </label>
              <select
                id="content-report-reason"
                value={reason}
                onChange={(event) => setReason(event.target.value as typeof reason)}
                className="min-h-11 w-full rounded-xl border border-input bg-background px-3 text-sm"
              >
                {reasons.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label htmlFor="content-report-details" className="text-sm font-semibold">
                تفاصيل إضافية (اختياري)
              </label>
              <textarea
                id="content-report-details"
                value={details}
                onChange={(event) => setDetails(event.target.value.slice(0, 1000))}
                rows={3}
                maxLength={1000}
                placeholder="اشرح المشكلة باختصار..."
                className="w-full resize-y rounded-xl border border-input bg-background p-3 text-sm"
              />
              <p className="text-end text-xs text-muted-foreground">{details.length}/1000</p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={busy}
                className="btn-secondary min-h-11 flex-1"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={() => void submit()}
                disabled={busy}
                className="btn-primary min-h-11 flex-1 disabled:opacity-50"
              >
                {busy ? "جارٍ الإرسال..." : "إرسال البلاغ"}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
