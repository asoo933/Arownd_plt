import { getSupabaseClient } from "@/lib/supabase";

export type InviteeRecord = {
  id: string;
  createdAt: string;
  displayName: string | null;
  avatarUrl: string | null;
};

export type InviteOverview = {
  code: string;
  referrals: InviteeRecord[];
  total: number;
};

export async function fetchMyInviteOverview(): Promise<InviteOverview> {
  const client = getSupabaseClient();
  const { data: auth, error: authError } = await client.auth.getUser();
  if (authError) throw authError;
  if (!auth.user) throw new Error("not_authenticated");

  const { data: profile, error: profileError } = await client
    .from("profiles")
    .select("referral_code")
    .eq("user_id", auth.user.id)
    .maybeSingle();

  if (profileError) throw profileError;
  if (!profile?.referral_code || typeof profile.referral_code !== "string") {
    throw new Error("invite_code_missing");
  }

  const { data: referralRows, error: referralsError } = await client
    .from("user_referrals")
    .select("invitee_user_id, created_at")
    .eq("inviter_user_id", auth.user.id)
    .order("created_at", { ascending: false });

  if (referralsError) throw referralsError;

  const rows = referralRows ?? [];
  const inviteeIds = rows.map((row) => row.invitee_user_id);
  const publicProfilesById = new Map<string, { full_name: string | null; avatar_url: string | null }>();

  if (inviteeIds.length > 0) {
    const { data: publicProfiles, error: publicProfilesError } = await client
      .from("public_personal_profiles")
      .select("user_id, full_name, avatar_url")
      .in("user_id", inviteeIds);

    if (publicProfilesError) throw publicProfilesError;

    for (const publicProfile of publicProfiles ?? []) {
      publicProfilesById.set(publicProfile.user_id, {
        full_name: publicProfile.full_name,
        avatar_url: publicProfile.avatar_url
      });
    }
  }

  const referrals = rows.map((row) => {
    const publicProfile = publicProfilesById.get(row.invitee_user_id);
    return {
      id: row.invitee_user_id,
      createdAt: row.created_at,
      displayName: publicProfile?.full_name?.trim() || null,
      avatarUrl: publicProfile?.avatar_url || null
    };
  });

  return {
    code: profile.referral_code,
    referrals,
    total: referrals.length
  };
}
