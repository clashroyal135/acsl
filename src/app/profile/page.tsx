import type { Metadata } from "next";
import Link from "next/link";
import { BarChart3, CheckCircle2, Code2, Layers3 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAllProblems } from "@/lib/database.server";

export const metadata: Metadata = { title: "Profile" };

export default async function ProfilePage() {
  const supabase = await createSupabaseServerClient();
  const { data: auth } = (await supabase?.auth.getUser()) ?? { data: { user: null } };
  if (!auth.user) return <main className="mx-auto max-w-3xl px-4 py-24 text-center"><h1 className="text-3xl font-black">Track your progress</h1><p className="mt-3 text-muted-foreground">Sign in to build a persistent ACSL practice record.</p><Link href="/login" className="mt-6 inline-flex rounded-lg bg-primary px-4 py-2 font-semibold text-primary-foreground">Sign in</Link></main>;
  const [{ data: profile }, { data: submissions }, problems] = await Promise.all([
    supabase!.from("profiles").select("display_name,role,created_at").eq("id", auth.user.id).maybeSingle(),
    supabase!.from("submissions").select("problem_id,verdict,language").eq("user_id", auth.user.id),
    getAllProblems(),
  ]);
  const accepted = new Set((submissions ?? []).filter((item) => item.verdict === "Accepted").map((item) => item.problem_id));
  const divisionStats = ["Junior", "Intermediate", "Senior"].map((division) => ({ division, solved: problems.filter((problem) => problem.division === division && accepted.has(problem.id)).length, total: problems.filter((problem) => problem.division === division).length }));
  const displayName = profile?.display_name || auth.user.user_metadata.display_name || auth.user.email?.split("@")[0];
  return <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6"><div className="flex items-center gap-4"><div className="grid h-16 w-16 place-items-center rounded-2xl bg-primary text-2xl font-black text-primary-foreground">{displayName?.[0]?.toUpperCase()}</div><div><h1 className="text-3xl font-black">{displayName}</h1><p className="text-muted-foreground">{auth.user.email}</p></div></div><div className="mt-9 grid gap-4 sm:grid-cols-3"><Stat icon={CheckCircle2} label="Problems solved" value={accepted.size} /><Stat icon={Code2} label="Submissions" value={submissions?.length ?? 0} /><Stat icon={Layers3} label="Divisions active" value={divisionStats.filter((item) => item.solved > 0).length} /></div><Card className="mt-6 p-6"><h2 className="flex items-center gap-2 font-bold"><BarChart3 className="h-5 w-5 text-primary" /> Progress by division</h2><div className="mt-6 space-y-5">{divisionStats.map((item) => <div key={item.division}><div className="mb-2 flex justify-between text-sm"><span className="font-semibold">{item.division}</span><span className="text-muted-foreground">{item.solved} / {item.total}</span></div><div className="h-2 rounded-full bg-muted"><div className="h-2 rounded-full bg-primary" style={{ width: `${item.total ? (item.solved / item.total) * 100 : 0}%` }} /></div></div>)}</div></Card></main>;
}

function Stat({ icon: Icon, label, value }: { icon: typeof CheckCircle2; label: string; value: number }) { return <Card className="p-5"><Icon className="h-5 w-5 text-primary" /><p className="mt-4 text-3xl font-black">{value}</p><p className="mt-1 text-sm text-muted-foreground">{label}</p></Card>; }
