import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, Code2, Layers3 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { getPublicProfile } from "@/lib/public-profile.server";

export const metadata: Metadata = { title: "Profile" };
export const dynamic = "force-dynamic";

export default async function PublicProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await getPublicProfile(id);
  if (!profile) notFound();
  return <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
    <Card className="p-6 sm:p-8">
      <div className="flex flex-wrap items-center gap-5">
        <div className="grid h-24 w-24 shrink-0 place-items-center overflow-hidden rounded-2xl bg-primary/10 text-3xl font-black text-primary">{profile.avatarUrl ? <img src={profile.avatarUrl} alt={`${profile.displayName}'s profile picture`} className="h-full w-full object-cover" /> : profile.displayName[0].toUpperCase()}</div>
        <div className="min-w-0"><p className="text-xs font-bold uppercase tracking-wider text-primary">Profile</p><h1 className="mt-1 break-words text-3xl font-black">{profile.displayName}</h1>{profile.fullName && <p className="mt-1 break-words text-muted-foreground">{profile.fullName}</p>}{profile.nameIsPrivate && <p className="mt-1 text-xs text-muted-foreground">Full name visible to administrators only.</p>}</div>
      </div>
      {profile.aboutMe && <div className="mt-6 border-t border-border pt-5"><h2 className="font-bold">About me</h2><p className="mt-3 whitespace-pre-wrap break-words text-sm leading-7 text-muted-foreground">{profile.aboutMe}</p></div>}
    </Card>
    <div className="mt-6 grid gap-4 sm:grid-cols-3">{[
      { label: "Problems solved", value: profile.solvedCount, Icon: CheckCircle2 },
      { label: "Problems attempted", value: profile.attemptedCount, Icon: Layers3 },
      { label: "Submissions", value: profile.submissionCount, Icon: Code2 },
    ].map(({ label, value, Icon }) => <Card key={label} className="p-5"><Icon className="h-5 w-5 text-primary" /><p className="mt-4 text-3xl font-black">{value}</p><p className="mt-1 text-sm text-muted-foreground">{label}</p></Card>)}</div>
    <Card className="mt-6 p-6"><h2 className="font-bold">Progress by problem</h2><div className="mt-4 grid gap-3 md:grid-cols-2">{profile.problems.map((problem) => <div key={problem.id} className="flex items-center justify-between gap-3 rounded-xl border border-border p-4"><div><Link href={`/problems/${problem.slug}`} className="text-sm font-semibold hover:text-primary">{problem.title}</Link><p className="mt-1 text-xs text-muted-foreground">{problem.division}</p></div><Badge className={problem.status === "Solved" ? "border-success/25 bg-success/10 text-success" : ""}>{problem.status}</Badge></div>)}</div>{!profile.problems.length && <p className="mt-4 text-sm text-muted-foreground">No published problems yet.</p>}</Card>
  </main>;
}
