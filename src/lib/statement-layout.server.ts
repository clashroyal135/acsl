import "server-only";
import { createHash } from "node:crypto";
import layouts from "@/lib/contest1/presentation.json";
import type { Problem, StatementBlock } from "@/lib/types";

// An admin's edited statement must never be replaced by an older worksheet layout.
export function withStatementLayout(problem: Problem): Problem {
  const layout = (layouts as Record<string, { sourceHash: string; blocks: StatementBlock[] }>)[problem.slug];
  if (!layout || createHash("sha256").update(problem.statement).digest("hex") !== layout.sourceHash) return problem;
  return { ...problem, statementLayout: layout.blocks };
}
