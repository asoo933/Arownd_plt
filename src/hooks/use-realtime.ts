import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { RealtimePostgresChangesFilter } from "@supabase/supabase-js";

export type RealtimeEvent = "INSERT" | "UPDATE" | "DELETE" | "*";

export interface RealtimeSubscription {
  /** اسم الجدول في قاعدة البيانات */
  table: string;
  /** فلتر Postgres (مثال: user_id=eq.<uuid>) — اختياري */
  filter?: string;
  /** مفاتيح React Query لإبطالها عند تغيير */
  queryKeys: string[][];
  /** أنواع الأحداث للاستماع (افتراضي: *) */
  events?: RealtimeEvent[];
  /** تفعيل/تعطيل الاشتراك (افتراضي: true) */
  enabled?: boolean;
}

/**
 * Hook عام للاشتراك في تغييرات Supabase Realtime.
 * عندorod أي تغيير matching، يُبطل مفاتيح React Query المحددة
 * (مما يُعيد fetching تلقائياً).
 *
 * مثال:
 *   useRealtimeSubscription({
 *     table: "notifications",
 *     filter: `user_id=eq.${user?.id}`,
 *     queryKeys: [["notifications"]],
 *   });
 */
export function useRealtimeSubscription(sub: RealtimeSubscription) {
  const qc = useQueryClient();
  const { table, filter, queryKeys, events = ["*"], enabled = true } = sub;

  useEffect(() => {
    if (!table || !enabled) return;

    const channelName = `rt:${table}:${filter ?? "all"}`;
    const channel = supabase.channel(channelName);

    const opts: RealtimePostgresChangesFilter<RealtimeEvent> = {
      event: events.length === 1 ? events[0] : "*",
      schema: "public",
      table,
    };
    if (filter) opts.filter = filter;

    channel.on("postgres_changes", opts, () => {
      queryKeys.forEach((k) => qc.invalidateQueries({ queryKey: k }));
    });

    channel.subscribe((status) => {
      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        console.warn(`[realtime] ${table} channel status:`, status);
      }
    });

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table, filter, qc, enabled, JSON.stringify(queryKeys), JSON.stringify(events)]);
}
