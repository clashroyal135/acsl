import "server-only";

import { createSupabaseAdminClient, createSupabaseServerClient } from "@/lib/supabase/server";

export async function requireAdmin() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  const admin = createSupabaseAdminClient();
  if (!admin) return null;
  const { data: profile, error: profileError } = await admin.from("profiles").select("role").eq("id", data.user.id).maybeSingle();
  return !profileError && profile?.role === "admin" ? admin : null;
}
