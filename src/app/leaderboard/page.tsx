import type { Metadata } from "next";
import { Medal } from "lucide-react";
import { Card } from "@/components/ui/card";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Leaderboard" };

export default async function LeaderboardPage() {
  const admin = createSupabaseAdminClient();
  let leaders: { id: string; name: string; solved: number; submissions: number }[] = [];
  if (admin) {
    const [{ data: accepted }, { data: profiles }] = await Promise.all([
      admin.from("submissions").select("user_id,problem_id").eq("verdict", "Accepted"),
      admin.from("profiles").select("id,display_name"),
    ]);
    const names = new Map((profiles ?? []).map((profile) => [profile.id, profile.display_name || "Anonymous coder"]));
    const users = new Map<string, { problems: Set<string>; submissions: number }>();
    for (const row of accepted ?? []) { const current = users.get(row.user_id) ?? { problems: new Set<string>(), submissions: 0 }; current.problems.add(row.problem_id); current.submissions += 1; users.set(row.user_id, current); }
    leaders = Array.from(users, ([id, stats]) => ({ id, name: names.get(id) ?? "Anonymous coder", solved: stats.problems.size, submissions: stats.submissions })).sort((a, b) => b.solved - a.solved || a.submissions - b.submissions).slice(0, 100);
  }
  return <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6"><p className="text-sm font-bold uppercase tracking-[.18em] text-primary">Community</p><h1 className="mt-2 text-4xl font-black tracking-tight">Leaderboard</h1><p className="mt-3 text-muted-foreground">Ranked by unique accepted problems, then by fewer accepted attempts.</p><Card className="mt-8 overflow-hidden"><div className="grid grid-cols-[60px_1fr_100px] border-b border-border px-5 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground sm:grid-cols-[70px_1fr_120px_140px]"><span>Rank</span><span>Student</span><span>Solved</span><span className="hidden sm:block">Accepted runs</span></div>{leaders.map((leader, index) => <div key={leader.id} className="grid grid-cols-[60px_1fr_100px] items-center border-b border-border px-5 py-4 last:border-0 sm:grid-cols-[70px_1fr_120px_140px]"><span className="font-mono font-bold">{index < 3 ? <Medal className={`h-5 w-5 ${index === 0 ? "text-warning" : index === 1 ? "text-muted-foreground" : "text-amber-700"}`} /> : index + 1}</span><span className="font-semibold">{leader.name}</span><span className="font-mono font-bold text-primary">{leader.solved}</span><span className="hidden text-sm text-muted-foreground sm:block">{leader.submissions}</span></div>)}{!leaders.length && <div className="px-5 py-16 text-center text-muted-foreground">No accepted submissions yet. The first spot is open.</div>}</Card></main>;
}
