import "server-only";
import { cache } from "react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { DEFAULT_PREFERENCES, profilePreferences } from "@/lib/preferences";

export const getViewerPreferences = cache(async () => {
  const supabase = await createSupabaseServerClient();
  const { data } = (await supabase?.auth.getUser()) ?? { data: { user: null } };
  if (!supabase || !data.user) return DEFAULT_PREFERENCES;
  const { data: profile } = await supabase.from("profiles").select("division,preferred_language").eq("id", data.user.id).maybeSingle();
  return profilePreferences(profile);
});
