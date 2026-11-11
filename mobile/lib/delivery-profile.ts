import { z } from "zod";

import { DeliveryProfileSchema, type DeliveryProfileInput } from "@/lib/delivery-profile-state";
import { getSupabaseClient } from "@/lib/supabase";

const ProfileSchema = z.object({
  full_name: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  wilaya_id: z.number().nullable().optional(),
  commune: z.string().nullable().optional()
});

export type DeliveryProfile = z.infer<typeof ProfileSchema>;

export async function fetchMyDeliveryProfile(): Promise<DeliveryProfile | null> {
  const client = getSupabaseClient();
  const { data: auth, error: authError } = await client.auth.getUser();
  if (authError) throw authError;
  if (!auth.user) throw new Error("not_authenticated");
  const { data, error } = await client.from("profiles")
    .select("full_name, phone, wilaya_id, commune")
    .eq("user_id", auth.user.id)
    .maybeSingle();
  if (error) throw error;
  return data ? ProfileSchema.parse(data as unknown) : null;
}

export async function saveMyDeliveryProfile(input: DeliveryProfileInput): Promise<void> {
  const parsed = DeliveryProfileSchema.parse(input);
  const client = getSupabaseClient();
  const { data: auth, error: authError } = await client.auth.getUser();
  if (authError) throw authError;
  if (!auth.user) throw new Error("not_authenticated");
  const { error } = await client.from("profiles").upsert({
    user_id: auth.user.id,
    full_name: parsed.full_name,
    phone: parsed.phone,
    wilaya_id: parsed.wilaya_id,
    commune: parsed.commune
  }, { onConflict: "user_id" });
  if (error) throw error;
}
