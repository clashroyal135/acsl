import type { Metadata } from "next";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAllProblems } from "@/lib/database.server";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Submissions" };

export default async function SubmissionsPage() {
  const supabase = await createSupabaseServerClient();
  const { data: auth } = (await supabase?.auth.getUser()) ?? { data: { user: null } };
  if (!auth.user) return <SignInEmpty title="Your submission history" />;
  const { data } = await supabase!.from("submissions").select("id,problem_id,language,verdict,passed_tests,total_tests,execution_time_ms,memory_kb,created_at").eq("user_id", auth.user.id).order("created_at", { ascending: false }).limit(100);
  const problems = await getAllProblems(); const names = new Map(problems.map((problem) => [problem.id, problem]));
  return <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6"><h1 className="text-4xl font-black tracking-tight">Submissions</h1><p className="mt-2 text-muted-foreground">Your latest judged solutions.</p><div className="mt-8 overflow-hidden rounded-2xl border border-border bg-card shadow-soft"><div className="hidden grid-cols-[1fr_110px_150px_100px_170px] gap-4 border-b border-border px-5 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground md:grid"><span>Problem</span><span>Language</span><span>Verdict</span><span>Tests</span><span>Submitted</span></div>{(data ?? []).map((row) => { const problem = names.get(row.problem_id); return <div key={row.id} className="grid gap-2 border-b border-border px-5 py-4 last:border-0 md:grid-cols-[1fr_110px_150px_100px_170px] md:items-center md:gap-4"><Link href={problem ? `/problems/${problem.slug}` : "/problems"} className="font-semibold hover:text-primary">{problem?.title ?? row.problem_id}</Link><span className="font-mono text-xs uppercase text-muted-foreground">{row.language}</span><span><Badge className={row.verdict === "Accepted" ? "border-success/25 bg-success/10 text-success" : "border-danger/25 bg-danger/10 text-danger"}>{row.verdict}</Badge></span><span className="text-sm text-muted-foreground">{row.passed_tests}/{row.total_tests}</span><time className="text-sm text-muted-foreground">{new Date(row.created_at).toLocaleString()}</time></div>; })}{!data?.length && <p className="px-5 py-14 text-center text-muted-foreground">No submissions yet. Pick a problem and send your first solution.</p>}</div></main>;
}

function SignInEmpty({ title }: { title: string }) { return <main className="mx-auto max-w-3xl px-4 py-24 text-center"><h1 className="text-3xl font-black">{title}</h1><p className="mt-3 text-muted-foreground">Sign in to save and review your work.</p><Link href="/login" className="mt-6 inline-flex rounded-lg bg-primary px-4 py-2 font-semibold text-primary-foreground">Sign in</Link></main>; }
