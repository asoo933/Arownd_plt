import { z } from "zod";
import { getSupabaseClient } from "@/lib/supabase";

const NotificationSchema = z.object({
  id: z.string().uuid(),
  type: z.enum(["info", "order", "offer", "reservation", "system"]),
  title: z.string(),
  body: z.string().nullable(),
  data: z.record(z.string(), z.unknown()).default({}),
  read: z.boolean(),
  created_at: z.string()
});

export type AppNotification = z.infer<typeof NotificationSchema>;

export async function fetchMyNotifications(): Promise<AppNotification[]> {
  const client = getSupabaseClient();
  const { data: auth, error: authError } = await client.auth.getUser();
  if (authError) throw authError;
  if (!auth.user) return [];
  const { data, error } = await client.from("notifications")
    .select("id, type, title, body, data, read, created_at")
    .eq("user_id", auth.user.id).order("created_at", { ascending: false }).limit(100);
  if (error) throw error;
  return NotificationSchema.array().parse(data as unknown);
}

export async function markNotificationRead(id: string): Promise<void> {
  const { error } = await getSupabaseClient().from("notifications")
    .update({ read: true }).eq("id", id).eq("read", false);
  if (error) throw error;
}

export async function markAllNotificationsRead(): Promise<void> {
  const client = getSupabaseClient();
  const { data: auth, error: authError } = await client.auth.getUser();
  if (authError) throw authError;
  if (!auth.user) throw new Error("not_authenticated");
  const { error } = await client.from("notifications").update({ read: true })
    .eq("user_id", auth.user.id).eq("read", false);
  if (error) throw error;
}

export function countUnreadNotifications(items: readonly AppNotification[]): number {
  return items.reduce((count, item) => count + (item.read ? 0 : 1), 0);
}