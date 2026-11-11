import type { ImagePickerAsset } from "expo-image-picker";

import { getSupabaseClient } from "@/lib/supabase";

const PROFILE_AVATAR_BUCKET = "profile-avatars";
const PROFILE_AVATAR_MAX_BYTES = 5 * 1024 * 1024;
const MIME_EXTENSIONS: Readonly<Record<string, string>> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp"
};

function getAvatarExtension(asset: Pick<ImagePickerAsset, "mimeType" | "fileName">): string | null {
  const mime = asset.mimeType?.toLowerCase();
  if (mime) return MIME_EXTENSIONS[mime] ?? null;
  const extension = asset.fileName?.split(".").pop()?.toLowerCase();
  if (!extension) return null;
  const extensions: Readonly<Record<string, string>> = { jpg: "jpg", jpeg: "jpg", png: "png", webp: "webp" };
  return extensions[extension] ?? null;
}

function getOwnedAvatarPath(url: string, userId: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return null;
    const marker = "/storage/v1/object/public/" + PROFILE_AVATAR_BUCKET + "/";
    const markerIndex = parsed.pathname.indexOf(marker);
    if (markerIndex < 0) return null;
    const path = decodeURIComponent(parsed.pathname.slice(markerIndex + marker.length));
    const segments = path.split("/");
    if (segments.length !== 2 || segments[0] !== userId ||
      segments.some((segment) => !segment || segment === "." || segment === "..")) return null;
    return path;
  } catch {
    return null;
  }
}

async function getAuthenticatedUser() {
  const client = getSupabaseClient();
  const { data, error } = await client.auth.getUser();
  if (error) throw error;
  if (!data.user) throw new Error("not_authenticated");
  return { client, user: data.user };
}

export async function uploadMyProfileAvatar(asset: ImagePickerAsset): Promise<void> {
  const extension = getAvatarExtension(asset);
  if (!extension || (asset.fileSize !== null && asset.fileSize !== undefined &&
    (!Number.isFinite(asset.fileSize) || asset.fileSize <= 0 || asset.fileSize > PROFILE_AVATAR_MAX_BYTES))) {
    throw new Error("invalid_profile_avatar");
  }

  const response = await fetch(asset.uri);
  if (!response.ok) throw new Error("profile_avatar_read_failed");
  const body = await response.arrayBuffer();
  if (body.byteLength === 0 || body.byteLength > PROFILE_AVATAR_MAX_BYTES) {
    throw new Error("invalid_profile_avatar_size");
  }

  const { client, user } = await getAuthenticatedUser();
  const { data: current, error: readError } = await client.from("profiles")
    .select("avatar_url")
    .eq("user_id", user.id)
    .maybeSingle();
  if (readError) throw readError;
  if (!current) throw new Error("profile_not_found");

  const path = user.id + "/avatar-" + Date.now().toString(36) + "-" +
    Math.random().toString(36).slice(2, 9) + "." + extension;
  const contentType = asset.mimeType?.toLowerCase() ?? (extension === "jpg" ? "image/jpeg" : "image/" + extension);
  const { error: uploadError } = await client.storage.from(PROFILE_AVATAR_BUCKET).upload(path, body, {
    contentType,
    cacheControl: "3600",
    upsert: false
  });
  if (uploadError) throw uploadError;

  const { data: publicData } = client.storage.from(PROFILE_AVATAR_BUCKET).getPublicUrl(path);
  const publicUrl = publicData.publicUrl;
  const { data: updated, error: updateError } = await client.from("profiles")
    .update({ avatar_url: publicUrl })
    .eq("user_id", user.id)
    .select("user_id")
    .maybeSingle();

  if (updateError || !updated) {
    const { error: cleanupError } = await client.storage.from(PROFILE_AVATAR_BUCKET).remove([path]);
    if (cleanupError) throw new Error("profile_avatar_cleanup_required", { cause: updateError ?? cleanupError });
    if (updateError) throw updateError;
    throw new Error("profile_not_updated");
  }

  if (current.avatar_url) {
    const oldPath = getOwnedAvatarPath(current.avatar_url, user.id);
    if (oldPath) {
      await client.storage.from(PROFILE_AVATAR_BUCKET).remove([oldPath]);
    }
  }
}

export async function removeMyProfileAvatar(): Promise<void> {
  const { client, user } = await getAuthenticatedUser();
  const { data: current, error: readError } = await client.from("profiles")
    .select("avatar_url")
    .eq("user_id", user.id)
    .maybeSingle();
  if (readError) throw readError;
  if (!current) throw new Error("profile_not_found");
  if (!current.avatar_url) return;

  const { data: updated, error: updateError } = await client.from("profiles")
    .update({ avatar_url: null })
    .eq("user_id", user.id)
    .select("user_id")
    .maybeSingle();
  if (updateError) throw updateError;
  if (!updated) throw new Error("profile_not_updated");

  const oldPath = getOwnedAvatarPath(current.avatar_url, user.id);
  if (oldPath) {
    const { error: removeError } = await client.storage.from(PROFILE_AVATAR_BUCKET).remove([oldPath]);
    if (removeError) throw removeError;
  }
}
