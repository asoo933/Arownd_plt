import { z } from "zod";

import { getSupabaseClient } from "@/lib/supabase";
import { assertActionRateLimit } from "@/lib/action-rate-limit";

const SupportConversationSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  subject: z.string(),
  status: z.enum(["open", "closed"]),
  last_message_at: z.string(),
  created_at: z.string(),
  updated_at: z.string()
});

const SupportMessageSchema = z.object({
  id: z.string().uuid(),
  conversation_id: z.string().uuid(),
  sender_id: z.string().uuid(),
  sender_role: z.enum(["customer", "support"]),
  message: z.string(),
  created_at: z.string()
});

export const supportConversationInputSchema = z.object({
  subject: z.string().trim().min(3).max(120),
  message: z.string().trim().min(1).max(4000)
});

export const supportMessageInputSchema = z.object({
  message: z.string().trim().min(1).max(4000)
});

export type SupportConversationInput = z.infer<typeof supportConversationInputSchema>;
export type SupportMessageInput = z.infer<typeof supportMessageInputSchema>;
export type SupportConversation = z.infer<typeof SupportConversationSchema>;
export type SupportMessage = z.infer<typeof SupportMessageSchema>;

export async function fetchMySupportConversations(): Promise<SupportConversation[]> {
  const client = getSupabaseClient();
  const { data: auth, error: authError } = await client.auth.getUser();
  if (authError) throw authError;
  if (!auth.user) return [];

  const { data, error } = await client
    .from("support_conversations")
    .select("id, user_id, subject, status, last_message_at, created_at, updated_at")
    .eq("user_id", auth.user.id)
    .order("last_message_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return SupportConversationSchema.array().parse(data as unknown);
}

export async function fetchSupportConversation(id: string): Promise<SupportConversation | null> {
  const { data, error } = await getSupabaseClient()
    .from("support_conversations")
    .select("id, user_id, subject, status, last_message_at, created_at, updated_at")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? SupportConversationSchema.parse(data as unknown) : null;
}

export async function fetchSupportMessages(conversationId: string): Promise<SupportMessage[]> {
  const { data, error } = await getSupabaseClient()
    .from("support_messages")
    .select("id, conversation_id, sender_id, sender_role, message, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(300);
  if (error) throw error;
  return SupportMessageSchema.array().parse(data as unknown);
}

export async function createSupportConversation(subject: string, message: string): Promise<string> {
  assertActionRateLimit("support:create-conversation", 10_000);
  const { data, error } = await getSupabaseClient().rpc("create_support_conversation", {
    _subject: subject.trim(),
    _message: message.trim()
  });
  if (error) throw error;
  return z.string().uuid().parse(data);
}

export async function sendSupportMessage(conversationId: string, message: string): Promise<void> {
  assertActionRateLimit("support:send-message:" + conversationId, 1_500);
  const client = getSupabaseClient();
  const { data: auth, error: authError } = await client.auth.getUser();
  if (authError) throw authError;
  if (!auth.user) throw new Error("not_authenticated");

  const { error } = await client.from("support_messages").insert({
    conversation_id: conversationId,
    sender_id: auth.user.id,
    sender_role: "customer",
    message: message.trim()
  });
  if (error) throw error;
}
