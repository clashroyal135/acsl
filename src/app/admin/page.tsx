import type { Metadata } from "next";
import { AdminDashboard } from "@/components/admin-dashboard";
import { createSupabaseAdminClient, createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Admin" };
export default async function AdminPage() {
  const supabase = await createSupabaseServerClient(); const admin = createSupabaseAdminClient();
  const { data: auth } = (await supabase?.auth.getUser()) ?? { data: { user: null } };
  let allowed = false;
  if (admin && auth.user) { const { data } = await admin.from("profiles").select("role").eq("id", auth.user.id).maybeSingle(); allowed = data?.role === "admin"; }
  if (!allowed) return <main className="mx-auto max-w-3xl px-4 py-24 text-center"><h1 className="text-3xl font-black">Administrator access required</h1><p className="mt-3 text-muted-foreground">Sign in with an account whose profile role is <code>admin</code>.</p></main>;
  return <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6"><p className="text-sm font-bold uppercase tracking-[.18em] text-primary">Administration</p><h1 className="mt-2 text-4xl font-black tracking-tight">Problem manager</h1><p className="mt-3 text-muted-foreground">Create, edit, publish, delete, or bulk-import problems and hidden cases.</p><AdminDashboard /></main>;
}
