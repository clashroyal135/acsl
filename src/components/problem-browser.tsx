"use client";

import Link from "next/link";
import { CheckCircle2, Search, SlidersHorizontal } from "lucide-react";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
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
  const solvedSet = useMemo(() => new Set(solved), [solved]);
  const topics = useMemo(() => ["All", ...Array.from(new Set(problems.map((problem) => problem.topic)))], [problems]);
  const visible = problems.filter((problem) => {
    const matchesText = `${problem.title} ${problem.topic}`.toLowerCase().includes(query.toLowerCase());
    const isSolved = solvedSet.has(problem.id);
    return matchesText && (division === "All" || problem.division === division) && (difficulty === "All" || problem.difficulty === difficulty) && (topic === "All" || problem.topic === topic) && (completion === "All" || (completion === "Solved" ? isSolved : !isSolved));
  });

  const selectClass = "h-10 w-full min-w-0 max-w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary lg:w-auto lg:min-w-36";

  return (
    <div>
      <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
        <div className="flex flex-col gap-3 lg:flex-row">
          <label className="relative flex-1"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by title or topic…" className="h-10 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-primary" /></label>
          <div className="grid min-w-0 grid-cols-1 gap-2 min-[440px]:grid-cols-2 lg:flex lg:w-auto lg:flex-wrap">
            <select aria-label="Division" value={division} onChange={(event) => setDivision(event.target.value as Division | "All")} className={selectClass}>{["All", "Junior", "Intermediate", "Senior"].map((item) => <option key={item} value={item}>{item === "All" ? "All divisions" : item}</option>)}</select>
            <select aria-label="Difficulty" value={difficulty} onChange={(event) => setDifficulty(event.target.value as Difficulty | "All")} className={selectClass}>{["All", "Easy", "Medium", "Hard"].map((item) => <option key={item} value={item}>{item === "All" ? "All difficulties" : item}</option>)}</select>
            <select aria-label="Topic" value={topic} onChange={(event) => setTopic(event.target.value)} className={selectClass}>{topics.map((item) => <option key={item} value={item}>{item === "All" ? "All topics" : item}</option>)}</select>
            <select aria-label="Completion" value={completion} onChange={(event) => setCompletion(event.target.value)} className={selectClass}>{["All", "Solved", "Unsolved"].map((item) => <option key={item}>{item}</option>)}</select>
          </div>
        </div>
      </div>

      <div className="mt-5 overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
        <div className="hidden grid-cols-[44px_1fr_150px_130px_120px] gap-4 border-b border-border px-5 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground md:grid"><span /><span>Problem</span><span>Division</span><span>Difficulty</span><span>Acceptance</span></div>
        {visible.map((problem) => {
          const isSolved = solvedSet.has(problem.id);
          return <Link href={`/problems/${problem.slug}`} key={problem.id} className="grid items-center gap-3 border-b border-border px-4 py-4 transition-colors last:border-0 hover:bg-muted/60 md:grid-cols-[44px_1fr_150px_130px_120px] md:gap-4 md:px-5">
            <span className="hidden md:block">{isSolved ? <CheckCircle2 className="h-5 w-5 text-success" /> : <span className="block h-5 w-5 rounded-full border-2 border-border" />}</span>
            <span><span className="flex items-center gap-2 font-semibold">{problem.title}{isSolved && <CheckCircle2 className="h-4 w-4 text-success md:hidden" />}</span><span className="mt-1 block text-sm text-muted-foreground">{problem.summary}</span><span className="mt-2 flex gap-2 md:hidden"><Badge>{problem.division}</Badge><Badge className={difficultyColor[problem.difficulty]}>{problem.difficulty}</Badge></span></span>
            <span className="hidden text-sm text-muted-foreground md:block">{problem.division}</span><span className="hidden md:block"><Badge className={cn(difficultyColor[problem.difficulty])}>{problem.difficulty}</Badge></span><span className="hidden font-mono text-sm text-muted-foreground md:block">{problem.acceptanceRate.toFixed(1)}%</span>
          </Link>;
        })}
        {!visible.length && <div className="px-5 py-16 text-center text-muted-foreground"><SlidersHorizontal className="mx-auto mb-3 h-7 w-7" /><p className="font-semibold text-foreground">No matching problems</p><p className="mt-1 text-sm">Try broadening one of the filters.</p></div>}
      </div>
      <p className="mt-4 text-sm text-muted-foreground">Showing {visible.length} of {problems.length} problems</p>
    </div>
  );
}
