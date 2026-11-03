import type { Metadata } from "next";
import { ProblemBrowser } from "@/components/problem-browser";
import { getAllProblems } from "@/lib/database.server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { profilePreferences } from "@/lib/preferences";

export const metadata: Metadata = { title: "Problems" };

async function getSolvedProblemIds() {
  const supabase = await createSupabaseServerClient();
  const { data: auth } = (await supabase?.auth.getUser()) ?? { data: { user: null } };
  let solved: string[] = [];
  if (supabase && auth.user) {
    const [{ data }, { data: profile }] = await Promise.all([
      supabase.from("submissions").select("problem_id").eq("user_id", auth.user.id).eq("verdict", "Accepted"),
      supabase.from("profiles").select("division,preferred_language").eq("id", auth.user.id).maybeSingle(),
    ]);
    solved = Array.from(new Set((data ?? []).map((row) => row.problem_id)));
    return { solved, preferences: profilePreferences(profile) };
  }

  return { solved, preferences: profilePreferences() };
}

export default async function ProblemsPage() {
  const [problems, { solved, preferences }] = await Promise.all([getAllProblems(), getSolvedProblemIds()]);
  return <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6"><h1 className="mb-8 text-4xl font-black tracking-tight">Problems</h1><ProblemBrowser problems={problems} solved={solved} preferredDivision={preferences.division} /></main>;
}
