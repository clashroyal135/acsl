import type { Metadata } from "next";
import { ProblemBrowser } from "@/components/problem-browser";
import { getAllProblems } from "@/lib/database.server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Problems" };

export default async function ProblemsPage() {
  const problems = await getAllProblems();
  const supabase = await createSupabaseServerClient();
  const { data: auth } = (await supabase?.auth.getUser()) ?? { data: { user: null } };
  let solved: string[] = [];
  if (supabase && auth.user) {
    const { data } = await supabase.from("submissions").select("problem_id").eq("user_id", auth.user.id).eq("verdict", "Accepted");
    solved = Array.from(new Set((data ?? []).map((row) => row.problem_id)));
  }

  return <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6"><div className="mb-8"><p className="text-sm font-bold uppercase tracking-[.18em] text-primary">Problem library</p><h1 className="mt-2 text-4xl font-black tracking-tight">Find your next challenge</h1><p className="mt-3 max-w-2xl text-muted-foreground">Original ACSL-style problems, organized for focused practice across every division.</p></div><ProblemBrowser problems={problems} solved={solved} /></main>;
}
