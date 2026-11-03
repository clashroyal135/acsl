"use client";

import Link from "next/link";
import { Check, ChevronDown, Search, SlidersHorizontal } from "lucide-react";
import { useMemo, useState } from "react";
import { groupProblems, preferredVersion, seasonLabel } from "@/lib/problem-groups";
import type { Division, Problem } from "@/lib/types";

export function ProblemBrowser({ problems, solved, preferredDivision = "Junior" }: { problems: Problem[]; solved: string[]; preferredDivision?: Division }) {
  const [query, setQuery] = useState("");
  const [division, setDivision] = useState<Division | "All">("All");
  const [completion, setCompletion] = useState("All");
  const [year, setYear] = useState("All");
  const solvedSet = useMemo(() => new Set(solved), [solved]);
  const groups = useMemo(() => groupProblems(problems), [problems]);
  const years = useMemo(() => Array.from(new Set(problems.map(problem => problem.year))).sort((a, b) => b - a), [problems]);
  const visible = groups.flatMap(group => {
    if (year !== "All" && String(group.year) !== year) return [];
    if (!`${group.title} ${seasonLabel(group.year)} Contest 1`.toLowerCase().includes(query.trim().toLowerCase())) return [];
    const versions = group.versions.filter(problem => division === "All" || problem.division === division);
    const target = preferredVersion(versions, preferredDivision);
    if (!target) return [];
    const isSolved = solvedSet.has(target.id);
    if (completion !== "All" && (completion === "Solved") !== isSolved) return [];
    return [{ ...group, target, isSolved }];
  });
  const selectClass = "block h-10 w-full min-w-0 appearance-none rounded-lg border border-border bg-background py-0 pl-3 pr-9 text-sm outline-none focus:ring-2 focus:ring-primary";

  return <div>
    <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
      <label className="relative block"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><input aria-label="Search problems" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search by title or year…" className="h-10 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-primary" /></label>
      <div className="mt-3 grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-3">
        <FilterSelect><select aria-label="Division" value={division} onChange={event => setDivision(event.target.value as Division | "All")} className={selectClass}>{["All", "Junior", "Intermediate", "Senior"].map(item => <option key={item} value={item}>{item === "All" ? "All divisions" : item}</option>)}</select></FilterSelect>
        <FilterSelect><select aria-label="Year" value={year} onChange={event => setYear(event.target.value)} className={selectClass}><option value="All">All years</option>{years.map(year => <option key={year} value={year}>{seasonLabel(year)}</option>)}</select></FilterSelect>
        <FilterSelect><select aria-label="Completion" value={completion} onChange={event => setCompletion(event.target.value)} className={selectClass}>{["All", "Solved", "Unsolved"].map(item => <option key={item}>{item}</option>)}</select></FilterSelect>
      </div>
    </div>
    <div className="mt-5 overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
      <div className="grid grid-cols-[minmax(0,1fr)_60px_85px] gap-3 border-b border-border px-4 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground sm:grid-cols-[minmax(0,1fr)_110px_120px] sm:px-5"><span>Problem</span><span className="text-center">Solved?</span><span>Year</span></div>
      {visible.map(group => <Link href={`/problems/${group.target.slug}`} key={group.key} className="grid grid-cols-[minmax(0,1fr)_60px_85px] items-center gap-3 border-b border-border px-4 py-4 transition-colors last:border-0 hover:bg-muted/60 sm:grid-cols-[minmax(0,1fr)_110px_120px] sm:px-5">
        <span><span className="block font-semibold">{group.title}</span><span className="mt-1 block text-xs text-muted-foreground">Contest 1</span></span>
        <span className="flex justify-center">{group.isSolved ? <Check aria-label="Solved" className="h-5 w-5 text-success" /> : <span aria-label="Not solved" className="text-muted-foreground">—</span>}</span>
        <span className="text-xs text-muted-foreground sm:text-sm">{seasonLabel(group.year)}</span>
      </Link>)}
      {!visible.length && <div className="px-5 py-16 text-center text-muted-foreground"><SlidersHorizontal className="mx-auto mb-3 h-7 w-7" /><p className="font-semibold text-foreground">No matching problems</p><p className="mt-1 text-sm">Try broadening one of the filters.</p></div>}
    </div>
    <p className="mt-4 text-sm text-muted-foreground">Showing {visible.length} of {groups.length} problems</p>
  </div>;
}

function FilterSelect({ children }: { children: React.ReactNode }) {
  return <span className="relative block min-w-0">{children}<ChevronDown aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /></span>;
}
