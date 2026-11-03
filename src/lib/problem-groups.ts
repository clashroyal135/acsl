import type { Division, Problem } from "@/lib/types";

export const DIVISIONS: Division[] = ["Junior", "Intermediate", "Senior"];
export type ProblemVersion = Pick<Problem, "id" | "slug" | "division">;
export type ProblemGroup = { key: string; title: string; year: number; versions: Problem[] };

export function seasonLabel(year: number) { return `${year}–${year + 1}`; }
export function problemGroupKey(problem: Pick<Problem, "title" | "year">) {
  return `${problem.year}:${problem.title.trim().toLowerCase()}`;
}

export function groupProblems(problems: Problem[]): ProblemGroup[] {
  const groups = new Map<string, ProblemGroup>();
  for (const problem of problems) {
    const key = problemGroupKey(problem);
    const group = groups.get(key) ?? { key, title: problem.title, year: problem.year, versions: [] };
    group.versions.push(problem);
    groups.set(key, group);
  }
  return [...groups.values()].map((group) => ({ ...group, versions: group.versions.sort((a, b) => DIVISIONS.indexOf(a.division) - DIVISIONS.indexOf(b.division)) }))
    .sort((a, b) => b.year - a.year || a.title.localeCompare(b.title));
}
