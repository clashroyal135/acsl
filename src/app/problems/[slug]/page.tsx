import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CodeWorkspace } from "@/components/code-workspace";
import { groupProblems, problemGroupKey, seasonLabel } from "@/lib/problem-groups";
import { getAllProblems, getProblemBySlug } from "@/lib/database.server";
import { problems } from "@/lib/problems";
import { requireAdmin } from "@/lib/admin.server";
import { getViewerPreferences } from "@/lib/preferences.server";

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return problems.map((problem) => ({ slug: problem.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const problem = await getProblemBySlug(slug);
  return { title: problem ? `${problem.title} · ${seasonLabel(problem.year)} · ${problem.division}` : "Problem" };
}

export default async function ProblemPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [problem, admin, allProblems, preferences] = await Promise.all([getProblemBySlug(slug), requireAdmin(), getAllProblems(), getViewerPreferences()]);
  if (!problem) notFound();
  const isAdmin = Boolean(admin);
  const versions = groupProblems(allProblems).find((group) => group.key === problemGroupKey(problem))?.versions.map(({ id, slug, division }) => ({ id, slug, division })) ?? [{ id: problem.id, slug: problem.slug, division: problem.division }];
  return <CodeWorkspace key={problem.id} problem={problem} isAdmin={isAdmin} versions={versions} preferredLanguage={preferences.preferredLanguage} />;
}
