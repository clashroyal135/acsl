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

  return <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6"><h1 className="mb-8 text-4xl font-black tracking-tight">Problems</h1><ProblemBrowser problems={problems} solved={solved} /></main>;
}
