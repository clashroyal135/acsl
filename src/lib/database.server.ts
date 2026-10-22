import "server-only";

import { problems as bundledProblems, getProblem as getBundledProblem } from "@/lib/problems";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import type { Problem } from "@/lib/types";
import type { StoredTestCase } from "@/lib/test-cases.server";

type ProblemRow = Omit<Problem, "starterCode" | "samples" | "constraints" | "hints"> & {
  starter_code: Problem["starterCode"];
  samples: Problem["samples"];
  constraints: string[];
  hints: string[];
};

function fromRow(row: Record<string, unknown>): Problem {
  return {
    id: String(row.id),
    slug: String(row.slug),
    title: String(row.title),
    division: row.division as Problem["division"],
    difficulty: row.difficulty as Problem["difficulty"],
    topic: String(row.topic),
    year: Number(row.year),
    acceptanceRate: Number(row.acceptance_rate ?? 0),
    summary: String(row.summary),
    statement: String(row.statement),
    inputSpec: String(row.input_spec),
    outputSpec: String(row.output_spec),
    constraints: (row.constraints as string[]) ?? [],
    samples: (row.samples as Problem["samples"]) ?? [],
    hints: (row.hints as string[]) ?? [],
    starterCode: row.starter_code as Problem["starterCode"],
    timeLimitMs: Number(row.time_limit_ms ?? 2000),
    memoryLimitKb: Number(row.memory_limit_kb ?? 128000),
  };
}

export async function getAllProblems(): Promise<Problem[]> {
  const admin = createSupabaseAdminClient();
  if (!admin) return bundledProblems;

  const { data, error } = await admin.from("problems").select("*").eq("is_published", true).order("created_at");
  if (error || !data) return bundledProblems;

  const dbProblems = data.map((row) => fromRow(row));
  const bundledSlugs = new Set(bundledProblems.map((problem) => problem.slug));
  return [...bundledProblems, ...dbProblems.filter((problem) => !bundledSlugs.has(problem.slug))];
}

export async function getProblemBySlug(slug: string): Promise<Problem | undefined> {
  const bundled = getBundledProblem(slug);
  if (bundled) return bundled;

  const admin = createSupabaseAdminClient();
  if (!admin) return undefined;
  const { data } = await admin.from("problems").select("*").eq("slug", slug).eq("is_published", true).maybeSingle();
  return data ? fromRow(data) : undefined;
}

export async function getDatabaseTests(problemId: string): Promise<StoredTestCase[]> {
  const admin = createSupabaseAdminClient();
  if (!admin) return [];
  const { data } = await admin
    .from("test_cases")
    .select("input, expected_output, is_hidden")
    .eq("problem_id", problemId)
    .order("position");
  return (data ?? []).map((row) => ({
    input: row.input,
    expectedOutput: row.expected_output,
    hidden: row.is_hidden,
  }));
}

export type { ProblemRow };
