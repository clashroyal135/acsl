import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { errorResponse, isAllowedOrigin } from "@/lib/api.server";
import { checkRateLimit } from "@/lib/rate-limit.server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isOwnAvatarPath, PROFILE_PICTURE_BUCKET, validateAvatar, validateProfileText } from "@/lib/profile";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (!isAllowedOrigin(request)) return errorResponse("Origin is not allowed.", 403);
  const supabase = await createSupabaseServerClient();
  if (!supabase) return errorResponse("Profile updates are not available yet.", 503);
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) return errorResponse("Sign in to edit your profile.", 401);
  const limit = checkRateLimit(`profile:${auth.user.id}`, 10, 60_000);
  if (!limit.allowed) return errorResponse("Too many updates. Please try again shortly.", 429, { "Retry-After": String(limit.retryAfter) });

  const storage = supabase.storage.from(PROFILE_PICTURE_BUCKET);
  let uploadedPath: string | null = null;
  async function discardUpload() {
    if (uploadedPath) {
      try { await storage.remove([uploadedPath]); } catch { /* Leave failed cleanup for a later retry. */ }
    }
  }

  try {
    const form = await request.formData();
    const visibility = form.get("showName");
    if (visibility !== "true" && visibility !== "false") return errorResponse("Choose whether to show your name on your profile.");
    const { displayName, fullName, showName, aboutMe } = validateProfileText(form.get("displayName"), form.get("name"), visibility === "true", form.get("aboutMe"));
    const avatar = form.get("avatar");
    if (avatar !== null && !(avatar instanceof File)) return errorResponse("Choose an image file.");
    const extension = avatar && avatar.size ? await validateAvatar(avatar) : null;
    const { data: current, error: lookupError } = await supabase.from("profiles").select("avatar_path").eq("id", auth.user.id).maybeSingle();
    if (lookupError) return errorResponse("Unable to load your profile. Please try again.", 500);
    if (!current) return errorResponse("Profile not found.", 404);
    let avatarPath: string | null = form.get("removeAvatar") === "true" ? null : current.avatar_path;
    if (avatar && extension) {
      const path = `${auth.user.id}/${randomUUID()}.${extension}`;
      const { error } = await storage.upload(path, avatar, { contentType: avatar.type, cacheControl: "3600", upsert: false });
      if (error) return errorResponse("Unable to upload your picture. Please try again.", 502);
      uploadedPath = path;
      avatarPath = path;
    }

    let avatarUrl: string | null = null;
    if (isOwnAvatarPath(avatarPath, auth.user.id)) {
      const { data, error } = await storage.createSignedUrl(avatarPath, 3600);
      if (error && uploadedPath) { await discardUpload(); return errorResponse("Unable to prepare your picture. Please try again.", 502); }
      avatarUrl = data?.signedUrl ?? null;
    }
    const { error } = await supabase.from("profiles").update({ display_name: displayName, full_name: fullName, show_name: showName, about_me: aboutMe, avatar_path: avatarPath, updated_at: new Date().toISOString() }).eq("id", auth.user.id).select("id").single();
    if (error) { await discardUpload(); return errorResponse("Unable to save your profile. Please try again.", 500); }

    // Keep the previous picture until its replacement is saved successfully.
    if (current.avatar_path !== avatarPath && isOwnAvatarPath(current.avatar_path, auth.user.id)) {
      try { await storage.remove([current.avatar_path]); } catch { /* The profile is already saved. */ }
    }
    return NextResponse.json({ displayName, fullName, showName, aboutMe, avatarUrl, hasAvatar: Boolean(avatarPath) }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    await discardUpload();
    return errorResponse(error instanceof Error && /^(Display name must|Name must|Enter your name|About me must|Choose)/.test(error.message) ? error.message : "Unable to save your profile. Please try again.");
  }
}
