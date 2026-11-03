import "server-only";
import catalog from "@/lib/contest1/catalog.json";
import { defaultStarter } from "@/lib/starters";
import type { Problem } from "@/lib/types";

export const problems: Problem[] = (catalog as Omit<Problem, "starterCode">[]).map((problem) => ({ ...problem, starterCode: defaultStarter }));
export function getProblem(slug: string) { return problems.find((problem) => problem.slug === slug); }
