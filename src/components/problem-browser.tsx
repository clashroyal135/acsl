"use client";

import Link from "next/link";
import { CheckCircle2, ChevronDown, Search, SlidersHorizontal } from "lucide-react";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { groupProblems, seasonLabel } from "@/lib/problem-groups";
import type { Difficulty, Division, Problem } from "@/lib/types";
import { cn } from "@/lib/utils";

const difficultyColor: Record<Difficulty, string> = {
  Easy: "border-success/25 bg-success/10 text-success",
  Medium: "border-warning/25 bg-warning/10 text-warning",
  Hard: "border-danger/25 bg-danger/10 text-danger",
};

export function ProblemBrowser({ problems, solved }: { problems: Problem[]; solved: string[] }) {
  const [query, setQuery] = useState("");
  const [division, setDivision] = useState<Division | "All">("All");
  const [difficulty, setDifficulty] = useState<Difficulty | "All">("All");
  const [topic, setTopic] = useState("All");
  const [completion, setCompletion] = useState("All");
  const [year, setYear] = useState("All");
  const solvedSet = useMemo(() => new Set(solved), [solved]);
  const groups = useMemo(() => groupProblems(problems), [problems]);
  const topics = useMemo(() => ["All", ...Array.from(new Set(problems.map((problem) => problem.topic))).sort()], [problems]);
  const years = useMemo(() => Array.from(new Set(problems.map((problem) => problem.year))).sort((a, b) => b - a), [problems]);
  const visible = groups.flatMap((group) => {
    if (year !== "All" && String(group.year) !== year) return [];
    const versions = group.versions.filter((problem) => {
      const text = `${problem.title} ${problem.topic} ${seasonLabel(problem.year)} Contest 1`.toLowerCase();
      const isSolved = solvedSet.has(problem.id);
      return text.includes(query.trim().toLowerCase()) && (division === "All" || problem.division === division) &&
        (difficulty === "All" || problem.difficulty === difficulty) && (topic === "All" || problem.topic === topic) &&
        (completion === "All" || (completion === "Solved" ? isSolved : !isSolved));
    });
    return versions.length ? [{ ...group, matchingVersions: versions }] : [];
  });
  const selectClass = "block h-10 w-full min-w-0 appearance-none rounded-lg border border-border bg-background py-0 pl-3 pr-9 text-sm outline-none focus:ring-2 focus:ring-primary lg:min-w-36";

  return <div>
    <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
      <label className="relative block"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><input aria-label="Search problems" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by title, topic, or year…" className="h-10 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-primary" /></label>
      <div className="mt-3 grid min-w-0 grid-cols-1 gap-2 min-[440px]:grid-cols-2 lg:grid-cols-5">
        <FilterSelect><select aria-label="Division" value={division} onChange={(event) => setDivision(event.target.value as Division | "All")} className={selectClass}>{["All", "Junior", "Intermediate", "Senior"].map((item) => <option key={item} value={item}>{item === "All" ? "All divisions" : item}</option>)}</select></FilterSelect>
        <FilterSelect><select aria-label="Year" value={year} onChange={(event) => setYear(event.target.value)} className={selectClass}><option value="All">All years</option>{years.map((year) => <option key={year} value={year}>{seasonLabel(year)}</option>)}</select></FilterSelect>
        <FilterSelect><select aria-label="Difficulty" value={difficulty} onChange={(event) => setDifficulty(event.target.value as Difficulty | "All")} className={selectClass}>{["All", "Easy", "Medium", "Hard"].map((item) => <option key={item} value={item}>{item === "All" ? "All difficulties" : item}</option>)}</select></FilterSelect>
        <FilterSelect><select aria-label="Topic" value={topic} onChange={(event) => setTopic(event.target.value)} className={selectClass}>{topics.map((item) => <option key={item} value={item}>{item === "All" ? "All topics" : item}</option>)}</select></FilterSelect>
        <FilterSelect><select aria-label="Completion" value={completion} onChange={(event) => setCompletion(event.target.value)} className={selectClass}>{["All", "Solved", "Unsolved"].map((item) => <option key={item}>{item}</option>)}</select></FilterSelect>
      </div>
    </div>
    <div className="mt-5 overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
      <div className="hidden grid-cols-[36px_minmax(0,1fr)_220px_110px] gap-4 border-b border-border px-5 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground md:grid"><span /><span>Problem</span><span>Divisions</span><span>Year</span></div>
      {visible.map((group) => {
        const target = group.matchingVersions[0];
        const solvedCount = group.versions.filter((version) => solvedSet.has(version.id)).length;
        const allSolved = solvedCount === group.versions.length;
        return <Link href={`/problems/${target.slug}`} key={group.key} className="grid items-center gap-3 border-b border-border px-4 py-4 transition-colors last:border-0 hover:bg-muted/60 md:grid-cols-[36px_minmax(0,1fr)_220px_110px] md:gap-4">
          <span className="hidden md:block">{allSolved ? <CheckCircle2 aria-label="All versions solved" className="h-5 w-5 text-success" /> : <span className="block h-5 w-5 rounded-full border-2 border-border" />}</span>
          <span><span className="flex items-center gap-2 font-semibold">{group.title}{allSolved && <CheckCircle2 className="h-4 w-4 text-success md:hidden" />}</span><span className="mt-1 block text-sm text-muted-foreground">Contest 1 · {target.topic}{solvedCount > 0 && ` · ${solvedCount}/${group.versions.length} versions solved`}</span><span className="mt-2 flex flex-wrap gap-2 md:hidden"><Badge>{seasonLabel(group.year)}</Badge>{group.matchingVersions.map((version) => <Badge key={version.id}>{version.division}</Badge>)}</span></span>
          <span className="hidden flex-wrap gap-1.5 md:flex">{group.matchingVersions.map((version) => <Badge key={version.id} className={cn(difficultyColor[version.difficulty])}>{version.division}{solvedSet.has(version.id) && " ✓"}</Badge>)}</span>
          <span className="hidden text-sm text-muted-foreground md:block">{seasonLabel(group.year)}</span>
        </Link>;
      })}
      {!visible.length && <div className="px-5 py-16 text-center text-muted-foreground"><SlidersHorizontal className="mx-auto mb-3 h-7 w-7" /><p className="font-semibold text-foreground">No matching problems</p><p className="mt-1 text-sm">Try broadening one of the filters.</p></div>}
    </div>
    <p className="mt-4 text-sm text-muted-foreground">Showing {visible.length} of {groups.length} problems · {visible.reduce((count, group) => count + group.matchingVersions.length, 0)} division versions</p>
  </div>;
}

function FilterSelect({ children }: { children: React.ReactNode }) {
  return <span className="relative block min-w-0">{children}<ChevronDown aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /></span>;
}
